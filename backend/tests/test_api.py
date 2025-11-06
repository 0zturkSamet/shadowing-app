"""
Basic API tests.

This module contains basic tests for the FastAPI application endpoints.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


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
    """Tests for authentication endpoints."""

    def test_register_not_implemented(self):
        """Test that register endpoint returns not implemented status."""
        response = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": "testpassword123",
                "name": "Test User",
                "learning_language": "Spanish"
            }
        )
        assert response.status_code == 501

    def test_login_not_implemented(self):
        """Test that login endpoint returns not implemented status."""
        response = client.post(
            "/api/auth/login",
            json={
                "email": "test@example.com",
                "password": "testpassword123"
            }
        )
        assert response.status_code == 501

    def test_get_current_user_not_implemented(self):
        """Test that get current user endpoint returns not implemented status."""
        response = client.get("/api/auth/me")
        assert response.status_code == 501


class TestVideoEndpoints:
    """Tests for video endpoints."""

    def test_search_videos_not_implemented(self):
        """Test that search videos endpoint returns not implemented status."""
        response = client.get("/api/videos/search?query=spanish&language=es")
        assert response.status_code == 501

    def test_get_transcript_not_implemented(self):
        """Test that get transcript endpoint returns not implemented status."""
        response = client.get("/api/videos/transcripts/abc123")
        assert response.status_code == 501
