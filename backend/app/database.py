"""SQLAlchemy engine and session management supporting PostgreSQL and SQLite."""

from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

connect_args = {}
if settings.database_url.startswith("sqlite"):
    db_file = settings.database_url.replace("sqlite:///", "", 1)
    if db_file and db_file != ":memory:":
        Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.database_url,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base for ORM models."""


def get_db() -> Generator[Session, None, None]:
    """Yield a scoped database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
