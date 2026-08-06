import datetime
import uuid
from typing import List, Optional

from geoalchemy2 import Geometry
from sqlalchemy import (
    String,
    Integer,
    Numeric,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Passenger(Base):
    __tablename__ = "passengers"

    id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )

    rating: Mapped[float] = mapped_column(
        Numeric(3, 2),
        default=5.00,
        nullable=False,
    )

    rating_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="passenger",
    )

    saved_places: Mapped[List["SavedPlace"]] = relationship(
        "SavedPlace",
        back_populates="passenger",
        cascade="all, delete-orphan",
    )

    ride_requests: Mapped[List["RideRequest"]] = relationship(
        "RideRequest",
        back_populates="passenger",
        cascade="all, delete-orphan",
    )


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
    )

    license_number: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
    )

    verification_status: Mapped[str] = mapped_column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    active_vehicle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("vehicles.id", ondelete="SET NULL"),
        nullable=True,
    )

    acceptance_rate: Mapped[float] = mapped_column(
        Numeric(5, 2),
        default=100.00,
        nullable=False,
    )

    win_rate: Mapped[float] = mapped_column(
        Numeric(5, 2),
        default=0.00,
        nullable=False,
    )

    rating: Mapped[float] = mapped_column(
        Numeric(3, 2),
        default=5.00,
        nullable=False,
    )

    rating_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    online_status: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    current_location = mapped_column(
        Geometry(
            geometry_type="POINT",
            srid=4326,
        ),
        nullable=True,
    )

    last_pinged_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="driver",
    )

    vehicles: Mapped[List["Vehicle"]] = relationship(
        "Vehicle",
        back_populates="driver",
        foreign_keys="[Vehicle.driver_id]",
        cascade="all, delete-orphan",
    )

    active_vehicle: Mapped[Optional["Vehicle"]] = relationship(
        "Vehicle",
        foreign_keys=[active_vehicle_id],
        post_update=True,
    )

    documents: Mapped[List["DriverDocument"]] = relationship(
        "DriverDocument",
        back_populates="driver",
        cascade="all, delete-orphan",
    )

    bids: Mapped[List["DriverBid"]] = relationship(
        "DriverBid",
        back_populates="driver",
        cascade="all, delete-orphan",
    )

    assignments: Mapped[List["RideAssignment"]] = relationship(
        "RideAssignment",
        back_populates="driver",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        Index(
            "idx_drivers_location",
            current_location,
            postgresql_using="gist",
        ),
        Index(
            "idx_drivers_online",
            online_status,
            verification_status,
        ),
    )


class Vehicle(Base, TimestampMixin):
    __tablename__ = "vehicles"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False,
    )

    make: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    model: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    year: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    color: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    plate_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="INACTIVE",
        nullable=False,
    )

    driver: Mapped["Driver"] = relationship(
        "Driver",
        foreign_keys=[driver_id],
        back_populates="vehicles",
    )


class DriverDocument(Base):
    __tablename__ = "driver_documents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"),
        nullable=False,
    )

    document_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    file_url: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        default="PENDING",
        nullable=False,
    )

    rejected_reason: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
    )

    expires_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    verified_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    verifier_admin_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("admin_users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True),
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    driver: Mapped["Driver"] = relationship(
        "Driver",
        back_populates="documents",
    )

    __table_args__ = (
        UniqueConstraint(
            "driver_id",
            "document_type",
            name="uq_driver_document_type",
        ),
    )