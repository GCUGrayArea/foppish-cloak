"""
Database connection management for AI Processor service.

This module provides SQLAlchemy engine and session management
with connection pooling for the Python AI processor service.
"""

import os
import logging
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import Pool
from contextlib import contextmanager

# Configure logging
logger = logging.getLogger(__name__)

# Database URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/demand_letters"
)

# Create SQLAlchemy engine with connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=5,          # Number of connections to maintain
    max_overflow=10,      # Additional connections when pool is exhausted
    pool_timeout=30,      # Seconds to wait before giving up on getting a connection
    pool_recycle=3600,    # Recycle connections after 1 hour
    pool_pre_ping=True,   # Test connections before using them
    echo=False,           # Set to True for SQL query logging (development)
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Log connection pool events
@event.listens_for(Pool, "connect")
def receive_connect(dbapi_conn, connection_record):
    """Log when a new database connection is created"""
    logger.debug("Database connection established")


@event.listens_for(Pool, "checkout")
def receive_checkout(dbapi_conn, connection_record, connection_proxy):
    """Log when a connection is checked out from the pool"""
    logger.debug("Database connection checked out from pool")


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.

    Usage:
        with get_db_session() as session:
            result = session.query(Model).all()

    Yields:
        Session: SQLAlchemy session
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session error: {e}")
        raise
    finally:
        session.close()


def get_session() -> Session:
    """
    Get a database session (must be manually closed).

    Note: Prefer using get_db_session() context manager for automatic cleanup.

    Returns:
        Session: SQLAlchemy session
    """
    return SessionLocal()


def test_connection() -> bool:
    """
    Test database connectivity.

    Returns:
        bool: True if connection successful
    """
    try:
        with engine.connect() as connection:
            result = connection.execute("SELECT 1")
            logger.info("Database connection test successful")
            return True
    except Exception as e:
        logger.error(f"Database connection test failed: {e}")
        return False


def close_connections():
    """
    Close all database connections.
    Should be called on application shutdown.
    """
    engine.dispose()
    logger.info("Database connections closed")


# Export commonly used items
__all__ = [
    "engine",
    "SessionLocal",
    "get_db_session",
    "get_session",
    "test_connection",
    "close_connections",
]
