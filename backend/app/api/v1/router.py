from fastapi import APIRouter
from app.api.v1.endpoints import auth, passengers, drivers, rides, wallet, payments, notifications, admin, settings

api_router = APIRouter()

# Register sub-routes
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(passengers.router, prefix="/passenger", tags=["Passenger"])
api_router.include_router(drivers.router, prefix="/driver", tags=["Driver"])
api_router.include_router(rides.router, prefix="/rides", tags=["Rides"])
api_router.include_router(wallet.router, prefix="/wallet", tags=["Wallet"])
api_router.include_router(payments.router, prefix="/payments", tags=["Payments"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])







