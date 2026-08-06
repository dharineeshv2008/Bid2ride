import datetime
from typing import Any
from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """SQLAlchemy declarative base class mapping fields."""
    pass


class TimestampMixin:
    """Provides created_at and updated_at datetime properties with UTC defaults."""
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        onupdate=datetime.datetime.utcnow,
        nullable=False
    )


class SoftDeleteMixin:
    """Provides soft-delete capabilities via a deleted_at datetime flag."""
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True),
        default=None,
        nullable=True
    )

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None
