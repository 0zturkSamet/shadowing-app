"""
Basic API smoke tests.

These tests make sure the highest-priority endpoints respond with the
expected status codes without depending on the more detailed test
fixtures in ``tests/test_auth.py``.
"""
import uuid

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def _unique_email() -> str:
    """Generate a unique email so SQLite fixtures don't collide between runs."""
    return f"basic-{uuid.uuid4().hex}@example.com"


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_check(self):
        """Test that health check endpoint returns healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestRootEndpoint:
    """Tests for the root endpoint."""

    def test_root(self):
        """Test that root endpoint returns API information."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "status" in data
        assert data["status"] == "running"


class TestAuthEndpoints:
    """Basic smoke tests for authentication endpoints."""

    def test_register_returns_user_profile(self):
        """Registering a user returns their profile information."""
        email = _unique_email()
        response = client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": "testpassword123",
                "name": "Test User",
                "learning_language": "Spanish"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == email
        assert data["name"] == "Test User"
        assert data["learning_language"] == "Spanish"

    def test_login_valid_credentials(self):
        """Logging in with valid credentials returns a token."""
        email = _unique_email()
        password = "testpassword123"
        client.post(
            "/api/auth/register",
            json={
                "email": email,
                "password": password,
                "name": "Test User",
                "learning_language": "Spanish"
            }
        )
        response = client.post(
            "/api/auth/login",
            json={"email": email, "password": password}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_get_current_user_requires_auth(self):
        """Accessing /me without a token fails with 403."""
        response = client.get("/api/auth/me")
        assert response.status_code == 403


class TestVideoEndpoints:
    """Basic tests for video endpoints."""

    def test_search_videos_returns_payload(self):
        """Search endpoint responds with results when query is provided."""
        response = client.get("/api/videos/search?q=spanish&language=es&max_results=1")
        assert response.status_code == 200
        data = response.json()
        assert "videos" in data
        assert "total_results" in data

    def test_get_video_not_found(self):
        """Requesting a missing video returns 404."""
        response = client.get("/api/videos/unknown-video-id")
        assert response.status_code == 404
