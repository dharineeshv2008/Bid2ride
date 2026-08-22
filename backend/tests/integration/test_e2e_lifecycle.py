import uuid
import pytest
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.models.user import OtpSession, User
from app.models.driver import Driver
from app.models.payment import Wallet
from app.core.security import create_access_token

@pytest.mark.asyncio
async def test_complete_e2e_bid2ride_lifecycle(db_session):
    """
    End-to-End Integration Test Suite validating complete Bid2Ride platform workflow:
    1. Health Check
    2. Passenger Auth & OTP Verification
    3. Driver Auth, Profile & Vehicle Setup
    4. Admin Auth
    5. Driver Availability Toggle
    6. Passenger Booking Request
    7. Driver Custom Bid Submission
    8. Passenger Bid Acceptance
    9. Driver Assignment Acceptance & Arrival
    10. Driver OTP Verification & Trip Start
    11. Live Driver Telemetry Streaming
    12. Trip Completion
    13. Payment Wallet Settlement
    14. Admin Telemetry & Metrics Verification
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        # 1. Health check verification
        health_res = await ac.get("/health")
        assert health_res.status_code == 200
        assert "status" in health_res.json()

        # 2. Auth OTP send for Passenger
        p_otp_res = await ac.post("/api/v1/auth/otp/send", json={"phone": "+15550199"})
        assert p_otp_res.status_code == 200
        p_session_id = p_otp_res.json()["session_id"]

        stmt = select(OtpSession).where(OtpSession.session_id == uuid.UUID(p_session_id))
        p_otp_code = (await db_session.execute(stmt)).scalars().first().code

        # 3. Auth OTP verify for Passenger
        p_verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "session_id": p_session_id,
            "code": p_otp_code
        })
        assert p_verify_res.status_code == 200
        passenger_token = p_verify_res.json()["access_token"]
        passenger_headers = {"Authorization": f"Bearer {passenger_token}"}

        # 4. Auth OTP send & verify for Driver
        d_otp_res = await ac.post("/api/v1/auth/otp/send", json={"phone": "+15550299"})
        assert d_otp_res.status_code == 200
        d_session_id = d_otp_res.json()["session_id"]

        stmt = select(OtpSession).where(OtpSession.session_id == uuid.UUID(d_session_id))
        d_otp_code = (await db_session.execute(stmt)).scalars().first().code

        d_verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "session_id": d_session_id,
            "code": d_otp_code
        })
        assert d_verify_res.status_code == 200

        # Promote Driver user role & create Driver profile record
        d_stmt = select(User).where(User.phone == "+15550299")
        d_user = (await db_session.execute(d_stmt)).scalars().first()
        d_user.role = "DRIVER"
        driver_profile = Driver(id=d_user.id, license_number="DL-E2E-9999", verification_status="APPROVED")
        db_session.add(driver_profile)

        # Top-up passenger wallet to $100 so the payment step (Step 15) can complete
        p_stmt = select(User).where(User.phone == "+15550199")
        p_user = (await db_session.execute(p_stmt)).scalars().first()
        p_wallet_stmt = select(Wallet).where(Wallet.user_id == p_user.id)
        p_wallet = (await db_session.execute(p_wallet_stmt)).scalars().first()
        if p_wallet:
            p_wallet.balance = 100.00
        else:
            db_session.add(Wallet(user_id=p_user.id, balance=100.00, currency="USD"))
        await db_session.commit()

        driver_token = create_access_token(subject=d_user.id, role="DRIVER")
        driver_headers = {"Authorization": f"Bearer {driver_token}"}

        # 5. Auth OTP send & verify for Admin
        a_otp_res = await ac.post("/api/v1/auth/otp/send", json={"phone": "+15550000"})
        assert a_otp_res.status_code == 200
        a_session_id = a_otp_res.json()["session_id"]

        stmt = select(OtpSession).where(OtpSession.session_id == uuid.UUID(a_session_id))
        a_otp_code = (await db_session.execute(stmt)).scalars().first().code

        a_verify_res = await ac.post("/api/v1/auth/otp/verify", json={
            "session_id": a_session_id,
            "code": a_otp_code
        })
        assert a_verify_res.status_code == 200

        a_stmt = select(User).where(User.phone == "+15550000")
        a_user = (await db_session.execute(a_stmt)).scalars().first()
        a_user.role = "ADMIN"
        await db_session.commit()

        admin_token = create_access_token(subject=a_user.id, role="ADMIN")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 6. Driver registers vehicle and toggles ONLINE availability
        veh_res = await ac.post("/api/v1/driver/vehicles", json={
            "make": "Toyota",
            "model": "Camry",
            "year": 2022,
            "color": "Silver",
            "plate_number": "E2E-123",
            "category": "ECONOMY"
        }, headers=driver_headers)
        assert veh_res.status_code in [200, 201]

        avail_res = await ac.put("/api/v1/driver/availability", json={"online_status": True, "lat": 37.7749, "lng": -122.4194}, headers=driver_headers)
        assert avail_res.status_code == 200
        assert avail_res.json()["online_status"] is True

        # 7. Passenger creates Ride Request with target budget
        ride_req_payload = {
            "pickup_address": "742 Evergreen Terrace",
            "pickup_lat": 37.7749,
            "pickup_lng": -122.4194,
            "dropoff_address": "100 Financial Center Blvd",
            "dropoff_lat": 37.7949,
            "dropoff_lng": -122.3994,
            "category": "ECONOMY",
            "budget": 15.00
        }
        create_ride_res = await ac.post("/api/v1/passenger/rides", json=ride_req_payload, headers=passenger_headers)
        assert create_ride_res.status_code == 201
        ride_id = create_ride_res.json()["id"]

        # 8. Driver submits custom bid
        bid_payload = {
            "request_id": ride_id,
            "amount": 15.00,
            "eta_minutes": 4
        }
        bid_res = await ac.post("/api/v1/driver/bids", json=bid_payload, headers=driver_headers)
        assert bid_res.status_code == 201
        bid_id = bid_res.json()["id"]

        # 9. Passenger accepts driver bid
        accept_res = await ac.post(f"/api/v1/passenger/rides/{ride_id}/accept-bid?bid_id={bid_id}", headers=passenger_headers)
        assert accept_res.status_code == 200
        assignment_id = accept_res.json()["data"]["assignment_id"]
        assignment_otp = accept_res.json()["data"]["otp"]

        # 10. Driver accepts assignment
        driver_accept_res = await ac.post(f"/api/v1/rides/{assignment_id}/accept-assignment", headers=driver_headers)
        assert driver_accept_res.status_code == 200
        assert driver_accept_res.json()["status"] == "DRIVER_ACCEPTED"

        # 11. Driver marks ARRIVED at pickup
        arrived_res = await ac.post(f"/api/v1/rides/{assignment_id}/arrived", headers=driver_headers)
        assert arrived_res.status_code == 200
        assert arrived_res.json()["status"] == "DRIVER_ARRIVED"

        # 12. Driver verifies passenger OTP code and starts trip
        start_res = await ac.post(f"/api/v1/rides/{assignment_id}/start", json={"otp": assignment_otp}, headers=driver_headers)
        assert start_res.status_code == 200
        assert start_res.json()["status"] == "IN_PROGRESS"

        # 13. Driver streams live GPS location pings
        gps_res = await ac.post(f"/api/v1/rides/{assignment_id}/location", json={
            "lat": 37.7800,
            "lng": -122.4100,
            "speed": 30.0,
            "heading": 90.0
        }, headers=driver_headers)
        assert gps_res.status_code == 200

        # 14. Driver completes trip
        complete_res = await ac.post(f"/api/v1/rides/{assignment_id}/complete", json={
            "distance_miles": 4.5,
            "duration_seconds": 750
        }, headers=driver_headers)
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "COMPLETED"

        # 15. Passenger settles payment with wallet balance deduction
        settle_res = await ac.post(f"/api/v1/payments/rides/{assignment_id}", json={
            "idempotency_key": f"e2e_pay_{assignment_id}"
        }, headers=passenger_headers)
        assert settle_res.status_code == 201
        assert settle_res.json()["status"] == "COMPLETED"

        # 16. Admin inspects dashboard KPI telemetry
        admin_overview_res = await ac.get("/api/v1/admin/dashboard", headers=admin_headers)
        assert admin_overview_res.status_code == 200
        assert "metrics" in admin_overview_res.json()
