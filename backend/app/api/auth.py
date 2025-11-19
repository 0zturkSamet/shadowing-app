"""
Authentication endpoints.

This module handles user registration, login, and profile retrieval.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from google_auth_oauthlib.flow import Flow
import secrets

from app.core.dependencies import get_db, get_current_user
from app.core.security import hash_password, verify_password, create_access_token
from app.models import User
from app.schemas import UserRegister, UserLogin, UserResponse, Token
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Import limiter for rate limiting (will be initialized in main.py)
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserRegister,
    db: Session = Depends(get_db)
) -> UserResponse:
    """
    Register a new user and return their profile.

    Args:
        user_data: User registration data (email, password, name, learning_language)
        db: Database session

    Returns:
        UserResponse: The created user

    Raises:
        HTTPException: If email already exists (400)

    Example:
        POST /api/auth/register
        {
            "email": "user@example.com",
            "password": "securepassword123",
            "name": "John Doe",
            "learning_language": "Spanish"
        }
    """
    # Check if user with this email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Hash the password
    hashed_password = hash_password(user_data.password)

    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        name=user_data.name,
        learning_language=user_data.learning_language
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    return new_user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    credentials: UserLogin,
    db: Session = Depends(get_db)
) -> Token:
    """
    Authenticate user and return JWT token.

    Args:
        credentials: User login credentials (email, password)
        db: Database session

    Returns:
        Token: JWT access token

    Raises:
        HTTPException: If credentials are invalid (401)

    Example:
        POST /api/auth/login
        {
            "email": "user@example.com",
            "password": "securepassword123"
        }
    """
    # Find user by email
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token
    access_token = create_access_token(data={"sub": user.email})

    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user)
) -> UserResponse:
    """
    Get current authenticated user's profile.

    Args:
        current_user: Current authenticated user from JWT token

    Returns:
        UserResponse: Current user data

    Raises:
        HTTPException: If user is not authenticated (401)

    Example:
        GET /api/auth/me
        Headers: Authorization: Bearer <token>
    """
    return current_user


@router.get("/google")
async def google_auth():
    """
    Initiate Google OAuth flow.

    Redirects the user to Google's OAuth consent screen.
    Stores the OAuth state parameter in a secure cookie for CSRF protection.

    Returns:
        RedirectResponse: Redirect to Google OAuth consent screen with state cookie

    Raises:
        HTTPException: If Google OAuth is not configured (500)
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth is not configured"
        )

    # Create OAuth flow
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=[
            "openid",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile"
        ],
        redirect_uri=settings.GOOGLE_REDIRECT_URI
    )

    # Generate authorization URL with state parameter
    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )

    # Store state in secure cookie to validate in callback (CSRF protection)
    response = RedirectResponse(url=authorization_url)
    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        secure=True,  # Only send over HTTPS
        samesite="lax",
        max_age=600  # 10 minutes expiration
    )

    return response


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
    oauth_state: str = Cookie(None)
):
    """
    Handle Google OAuth callback.

    Receives authorization code from Google, exchanges it for tokens,
    and creates or logs in the user. Validates the state parameter to prevent CSRF attacks.

    Args:
        code: Authorization code from Google
        state: State parameter from Google (must match stored cookie)
        db: Database session
        oauth_state: Stored state from cookie for CSRF validation

    Returns:
        Token: JWT access token with redirect URL

    Raises:
        HTTPException: If OAuth flow fails or state validation fails (400)
    """
    # Validate state parameter to prevent CSRF attacks
    if not oauth_state or state != oauth_state:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid state parameter - possible CSRF attack"
        )

    try:
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=[
                "openid",
                "https://www.googleapis.com/auth/userinfo.email",
                "https://www.googleapis.com/auth/userinfo.profile"
            ],
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )

        # Exchange authorization code for tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Verify ID token and get user info
        id_info = id_token.verify_oauth2_token(
            credentials.id_token,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        google_user_id = id_info["sub"]
        email = id_info["email"]
        name = id_info.get("name", email.split("@")[0])

        # Check if user exists by Google ID or email
        user = db.query(User).filter(
            (User.google_id == google_user_id) | (User.email == email)
        ).first()

        if user:
            # Update existing user with Google ID if not set
            if not user.google_id:
                user.google_id = google_user_id
                db.commit()
                db.refresh(user)
        else:
            # Create new user with Google OAuth
            user = User(
                email=email,
                name=name,
                google_id=google_user_id,
                learning_language="English",  # Default, user can change later
                password_hash=None  # OAuth users don't have passwords
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Create JWT token
        access_token = create_access_token(data={"sub": user.email})

        # Redirect to frontend with token
        frontend_url = settings.ALLOWED_ORIGINS[0] if settings.ALLOWED_ORIGINS else "http://localhost:3000"
        redirect_url = f"{frontend_url}/auth/callback?token={access_token}"

        # Clear the OAuth state cookie after successful validation
        response = RedirectResponse(url=redirect_url)
        response.delete_cookie(key="oauth_state")

        return response

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth authentication failed: {str(e)}"
        )
