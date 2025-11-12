"""
Database connection and session management.

This module sets up the database connection using SQLAlchemy and
provides session helpers. When the configured database is unavailable
the module falls back to a local SQLite database so that tests and
local development can continue to run.
"""
from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings


logger = logging.getLogger(__name__)


def _create_engine(database_url: str):
    """Create an SQLAlchemy engine with sensible defaults."""
    connect_args = {}
    if database_url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}

    return create_engine(
        database_url,
        pool_pre_ping=True,
        echo=settings.DEBUG,
        connect_args=connect_args,
    )


PRIMARY_DATABASE_URL = settings.DATABASE_URL
FALLBACK_DATABASE_URL = "sqlite:///./shadowing_local.db"

# Global engine/session references. These may be reconfigured if we need to
# fall back to SQLite.
engine = _create_engine(PRIMARY_DATABASE_URL)
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for all models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Dependency for getting database sessions.

    Yields:
        Session: SQLAlchemy database session

    Example:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    _ensure_engine()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database by creating all tables.

    If the primary database cannot be reached, fall back to SQLite.
    """
    _ensure_engine()
    Base.metadata.create_all(bind=engine)


def _ensure_engine() -> None:
    """
    Ensure the current engine is usable; otherwise switch to the fallback.
    """
    global engine, SessionLocal

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except OperationalError as exc:
        if str(engine.url) == FALLBACK_DATABASE_URL:
            # Already using fallback, re-raise the exception.
            raise

        logger.warning(
            "Failed to connect to primary database (%s). Falling back to SQLite at %s",
            exc,
            FALLBACK_DATABASE_URL,
        )
        engine = _create_engine(FALLBACK_DATABASE_URL)
        SessionLocal.configure(bind=engine)
