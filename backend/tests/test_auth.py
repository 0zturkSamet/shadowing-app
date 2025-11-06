"""
Tests for authentication endpoints.

This module contains tests for user registration, login, and profile retrieval.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base
from app.core.dependencies import get_db
from app.models import User
from app.core.security import hash_password


# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override the get_db dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    """Create tables before each test and drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user():
    """Create a test user in the database."""
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        password_hash=hash_password("testpassword123"),
        name="Test User",
        learning_language="Spanish"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()
    return user


def test_register_new_user():
    """Test registering a new user with valid data."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "securepass123",
            "name": "New User",
            "learning_language": "French"
        }
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["name"] == "New User"
    assert data["learning_language"] == "French"
    assert "id" in data
    assert "created_at" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(test_user):
    """Test that registering with an existing email fails."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@example.com",
            "password": "anotherpass123",
            "name": "Another User",
            "learning_language": "German"
        }
    )

    assert response.status_code == 400
    assert "already registered" in response.json()["detail"].lower()


def test_register_invalid_email():
    """Test that registering with an invalid email fails."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "not-an-email",
            "password": "securepass123",
            "name": "Test User",
            "learning_language": "Spanish"
        }
    )

    assert response.status_code == 422


def test_register_short_password():
    """Test that registering with a password shorter than 8 characters fails."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "user@example.com",
            "password": "short",
            "name": "Test User",
            "learning_language": "Spanish"
        }
    )

    assert response.status_code == 422


def test_login_valid_credentials(test_user):
    """Test logging in with valid credentials."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


def test_login_wrong_password(test_user):
    """Test that logging in with wrong password fails."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "wrongpassword"
        }
    )

    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_login_nonexistent_user():
    """Test that logging in with non-existent email fails."""
    response = client.post(
        "/api/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "anypassword123"
        }
    )

    assert response.status_code == 401
    assert "incorrect" in response.json()["detail"].lower()


def test_get_current_user(test_user):
    """Test getting current user profile with valid token."""
    # First, login to get token
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "testpassword123"
        }
    )
    token = login_response.json()["access_token"]

    # Then, get current user
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["name"] == "Test User"
    assert data["learning_language"] == "Spanish"
    assert "password" not in data
    assert "password_hash" not in data


def test_get_current_user_no_token():
    """Test that accessing /me without token fails."""
    response = client.get("/api/auth/me")

    assert response.status_code == 403  # No credentials provided


def test_get_current_user_invalid_token():
    """Test that accessing /me with invalid token fails."""
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid-token-here"}
    )

    assert response.status_code == 401


def test_full_auth_flow():
    """Test complete authentication flow: register -> login -> get profile."""
    # Step 1: Register
    register_response = client.post(
        "/api/auth/register",
        json={
            "email": "flowtest@example.com",
            "password": "flowpass123",
            "name": "Flow Test",
            "learning_language": "Japanese"
        }
    )
    assert register_response.status_code == 201

    # Step 2: Login
    login_response = client.post(
        "/api/auth/login",
        json={
            "email": "flowtest@example.com",
            "password": "flowpass123"
        }
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    # Step 3: Get profile
    profile_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["email"] == "flowtest@example.com"
    assert profile_data["name"] == "Flow Test"
    assert profile_data["learning_language"] == "Japanese"
