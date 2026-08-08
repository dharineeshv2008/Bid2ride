# 📚 REST API & WebSockets Reference

The Bid2Ride backend is powered by **FastAPI** and **python-socketio**. It exposes asynchronous REST endpoints alongside a real-time WebSocket protocol for ride bidding, driver location tracking, and trip updates.

---

## 🔑 Authentication

All authenticated endpoints require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Endpoints

#### `POST /api/v1/auth/phone/verify`
Exchanges a Firebase Auth ID Token (obtained via SMS OTP verification) for a Bid2Ride JWT session token.
- **Request Body**:
  ```json
  {
    "id_token": "eyJhbGciOiJSUzI1NiIs...",
    "role": "passenger"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "user": {
      "id": "usr_94a8c1f0",
      "phone": "+15550192834",
      "role": "passenger"
    }
  }
  ```

---

## 🚕 Bidding & Trip Lifecycle APIs

#### `POST /api/v1/passengers/rides`
Creates a new ride request and initiates the broadcast to nearby drivers.
- **Request Body**:
  ```json
  {
    "pickup_location": {
      "address": "123 Market St, San Francisco, CA",
      "latitude": 37.774929,
      "longitude": -122.419416
    },
    "dropoff_location": {
      "address": "789 Mission St, San Francisco, CA",
      "latitude": 37.785834,
      "longitude": -122.406417
    },
    "suggested_fare": 25.00
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "ride_id": "ride_51a4b9c",
    "status": "bidding_open",
    "expires_in_seconds": 120
  }
  ```

#### `POST /api/v1/drivers/rides/{ride_id}/bid`
Submits a counter-offer bid for an active ride request.
- **Request Body**:
  ```json
  {
    "bid_amount": 22.50,
    "estimated_arrival_minutes": 5
  }
  ```

#### `POST /api/v1/passengers/rides/{ride_id}/accept-bid`
Passenger accepts a driver's bid, locking the fare in escrow and assigning the trip.
- **Request Body**:
  ```json
  {
    "bid_id": "bid_8832a1"
  }
  ```

---

## 💳 Wallet & Payment Endpoints

#### `GET /api/v1/wallet/balance`
Retrieves current user wallet balance and escrow locks.

#### `POST /api/v1/wallet/topup`
Top-up wallet funds via payment provider integration.
- **Request Body**:
  ```json
  {
    "amount": 50.00,
    "payment_method_id": "pm_card_visa"
  }
  ```

---

## 🛰️ Real-Time WebSocket Protocol (Socket.IO)

Clients connect to `ws://localhost:8000/socket.io/` with auth headers.

### Driver Location Updates (`driver:location_update`)
Driver devices stream GPS coordinates every 5 seconds:
```json
{
  "driver_id": "drv_102938",
  "latitude": 37.775100,
  "longitude": -122.419200,
  "heading": 180.5
}
```

### New Bid Notification (`passenger:new_bid`)
Broadcast to passenger when a nearby driver submits a bid:
```json
{
  "ride_id": "ride_51a4b9c",
  "bid_id": "bid_8832a1",
  "driver": {
    "name": "Alex Smith",
    "rating": 4.9,
    "vehicle": "Toyota Prius (White)"
  },
  "bid_amount": 22.50,
  "eta_minutes": 5
}
```
