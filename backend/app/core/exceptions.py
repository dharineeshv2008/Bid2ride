from typing import Any, Optional


class Bid2RideException(Exception):
    """Base Exception for all Bid2Ride errors."""
    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_SERVER_ERROR",
        status_code: int = 500,
        details: Optional[Any] = None
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class EntityNotFoundException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="ENTITY_NOT_FOUND",
            status_code=404,
            details=details
        )


class AuthenticationException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="AUTHENTICATION_FAILED",
            status_code=401,
            details=details
        )


class PermissionDeniedException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="PERMISSION_DENIED",
            status_code=403,
            details=details
        )


class ValidationException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=422,
            details=details
        )


class BiddingClosedException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="BIDDING_CLOSED",
            status_code=400,
            details=details
        )


class InsufficientWalletBalanceException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="INSUFFICIENT_BALANCE",
            status_code=402,
            details=details
        )


class GeofenceException(Bid2RideException):
    def __init__(self, message: str, details: Optional[Any] = None) -> None:
        super().__init__(
            message=message,
            code="GEOFENCE_VIOLATION",
            status_code=400,
            details=details
        )
