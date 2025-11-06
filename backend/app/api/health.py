"""
Health check endpoint.

This module provides a simple health check endpoint to verify
the API is running and accessible.
"""
from fastapi import APIRouter
from typing import Dict

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check() -> Dict[str, str]:
    """
    Health check endpoint.

    Returns:
        Dict with status indicating the API is healthy

    Example:
        GET /health
        Response: {"status": "healthy"}
    """
    return {"status": "healthy"}
