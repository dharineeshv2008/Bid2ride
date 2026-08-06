from app.models import (
    Base,
    User,
    RefreshToken,
    OtpSession,
    Passenger,
    Driver,
    Vehicle,
    DriverDocument,
    SavedPlace,
    RideRequest,
    DriverBid,
    RideAssignment,
    RideTracking,
    RideStatusHistory,
    Wallet,
    Payment,
    WalletTransaction,
    Rating,
    Review,
    AdminUser,
    AuditLog,
    SystemSetting,
    Notification,
)


def test_models_mapped() -> None:
    """Verifies that all required models are correctly mapped to SQLAlchemy metadata."""
    metadata_tables = Base.metadata.tables.keys()
    
    expected_tables = {
        "users",
        "refresh_tokens",
        "otp_sessions",
        "passengers",
        "drivers",
        "vehicles",
        "driver_documents",
        "saved_places",
        "ride_requests",
        "driver_bids",
        "ride_assignments",
        "ride_tracking",
        "ride_status_history",
        "wallets",
        "payments",
        "wallet_transactions",
        "ratings",
        "reviews",
        "admin_users",
        "audit_logs",
        "system_settings",
        "notifications",
    }

    for table in expected_tables:
        assert table in metadata_tables, f"Table {table} is missing from metadata mapping"


def test_user_properties() -> None:
    """Verifies User model attributes."""
    assert hasattr(User, "id")
    assert hasattr(User, "phone")
    assert hasattr(User, "email")
    assert hasattr(User, "name")
    assert hasattr(User, "role")
    assert hasattr(User, "is_active")
    assert hasattr(User, "passenger")
    assert hasattr(User, "driver")


def test_driver_properties() -> None:
    """Verifies Driver model attributes and geolocations."""
    assert hasattr(Driver, "license_number")
    assert hasattr(Driver, "verification_status")
    assert hasattr(Driver, "current_location")
    assert hasattr(Driver, "online_status")


def test_ride_properties() -> None:
    """Verifies RideRequest and Bids attributes."""
    assert hasattr(RideRequest, "pickup_location")
    assert hasattr(RideRequest, "dropoff_location")
    assert hasattr(RideRequest, "budget")
    assert hasattr(DriverBid, "amount")
    assert hasattr(DriverBid, "eta_minutes")
