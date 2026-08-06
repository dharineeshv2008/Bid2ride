import datetime
import uuid
from typing import List, Optional
from sqlalchemy import String, Integer, Numeric, DateTime, ForeignKey, Index, UniqueConstraint, BigInteger
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry

from app.models.base import Base, TimestampMixin


class SavedPlace(Base):
    __tablename__ = "saved_places"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    passenger_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("passengers.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=False)
    
    # PostGIS spatial point
    location = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    # Relationships
    passenger: Mapped["Passenger"] = relationship("Passenger", back_populates="saved_places")

    __table_args__ = (
        UniqueConstraint("passenger_id", "label", name="uq_passenger_saved_place_label"),
    )


class RideRequest(Base, TimestampMixin):
    __tablename__ = "ride_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    passenger_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("passengers.id", ondelete="CASCADE"), nullable=False
    )
    
    # PostGIS spatial points for locations
    pickup_location = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
    pickup_address: Mapped[str] = mapped_column(String, nullable=False)
    
    dropoff_location = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
    dropoff_address: Mapped[str] = mapped_column(String, nullable=False)
    
    budget: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(20), nullable=False)  # ECONOMY, COMFORT, XL
    status: Mapped[str] = mapped_column(
        String(50), default="PENDING_BIDS", nullable=False
    )  # PENDING_BIDS, MATCHED, COMPLETED, CANCELLED

    # Relationships
    passenger: Mapped["Passenger"] = relationship("Passenger", back_populates="ride_requests")
    bids: Mapped[List["DriverBid"]] = relationship(
        "DriverBid", back_populates="request", cascade="all, delete-orphan"
    )
    assignment: Mapped[Optional["RideAssignment"]] = relationship(
        "RideAssignment", back_populates="request", uselist=False, cascade="all, delete-orphan"
    )
    status_history: Mapped[List["RideStatusHistory"]] = relationship(
        "RideStatusHistory", back_populates="ride_request", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_rides_pickup_spatial", pickup_location, postgresql_using="gist"),
        Index("idx_rides_status", status),
    )


class DriverBid(Base):
    __tablename__ = "driver_bids"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ride_requests.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    eta_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="SUBMITTED", nullable=False
    )  # SUBMITTED, ACCEPTED, REJECTED, EXPIRED
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    # Relationships
    request: Mapped["RideRequest"] = relationship("RideRequest", back_populates="bids")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="bids")

    __table_args__ = (
        UniqueConstraint("request_id", "driver_id", name="uq_request_driver_bid"),
    )


class RideAssignment(Base, TimestampMixin):
    __tablename__ = "ride_assignments"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ride_requests.id", ondelete="CASCADE"), nullable=False
    )
    driver_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False
    )
    chosen_bid_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("driver_bids.id", ondelete="RESTRICT"), nullable=False
    )
    otp: Mapped[str] = mapped_column(String(4), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="ACCEPTED", nullable=False
    )  # ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED
    started_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    ended_at: Mapped[Optional[datetime.datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    distance_miles: Mapped[Optional[float]] = mapped_column(Numeric(6, 2), nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    price_charged: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)

    # Relationships
    request: Mapped["RideRequest"] = relationship("RideRequest", back_populates="assignment")
    driver: Mapped["Driver"] = relationship("Driver", back_populates="assignments")
    chosen_bid: Mapped["DriverBid"] = relationship("DriverBid", foreign_keys=[chosen_bid_id])
    payments: Mapped[List["Payment"]] = relationship(
        "Payment", back_populates="assignment", cascade="all, delete-orphan"
    )
    tracking_logs: Mapped[List["RideTracking"]] = relationship(
        "RideTracking", back_populates="assignment", cascade="all, delete-orphan"
    )


class RideTracking(Base):
    __tablename__ = "ride_tracking"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True, nullable=False
    )
    assignment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ride_assignments.id", ondelete="CASCADE"), nullable=False
    )
    
    # PostGIS location point
    location = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=False
    )
    speed: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    heading: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    pinged_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    # Relationships
    assignment: Mapped["RideAssignment"] = relationship("RideAssignment", back_populates="tracking_logs")

    __table_args__ = (
        Index("idx_tracking_assignment_time", assignment_id, pinged_at.desc()),
    )


class RideStatusHistory(Base):
    __tablename__ = "ride_status_history"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, nullable=False
    )
    ride_request_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ride_requests.id", ondelete="CASCADE"), nullable=False
    )
    old_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    changed_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    comment: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.datetime.utcnow, nullable=False
    )

    # Relationships
    ride_request: Mapped["RideRequest"] = relationship("RideRequest", back_populates="status_history")
