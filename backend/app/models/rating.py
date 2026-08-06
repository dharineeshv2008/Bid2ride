import datetime
import uuid
from typing import Optional
from sqlalchemy import String, Integer, DateTime, ForeignKey, UniqueConstraint, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Rating(Base):
    __tablename__ = "ratings"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ride_assignments.id", ondelete="CASCADE"), nullable=False
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    target_role: Mapped[str] = mapped_column(
        String(10), nullable=False
    )  # PASSENGER, DRIVER
    rating_value: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        nullable=False
    )

    # Relationships
    review: Mapped[Optional["Review"]] = relationship(
        "Review", back_populates="rating", uselist=False, cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("assignment_id", "target_role", name="uq_assignment_target_rating"),
        CheckConstraint("rating_value >= 1 AND rating_value <= 5", name="chk_rating_value_bounds"),
    )


class Review(Base):
    __tablename__ = "reviews"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    rating_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ratings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    feedback_text: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        nullable=False
    )

    # Relationships
    rating: Mapped["Rating"] = relationship("Rating", back_populates="review")
