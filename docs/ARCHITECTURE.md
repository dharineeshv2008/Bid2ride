# 🏗️ Architecture & System Design

This document details the architectural principles, component interactions, and spatial data flow powering **Bid2Ride**.

---

## 📐 System Architecture Overview

```
                          ┌──────────────────────────┐
                          │   Landing / Marketing    │
                          │   (React + Vite - 5173)  │
                          └──────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  Passenger App   │         │    Driver App    │         │   Admin Portal   │
│ (React - 5174)   │         │  (React - 5175)  │         │  (React - 5176)  │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         │ REST & WebSockets (Socket.IO) │                         │
         └────────────────────────────┼────────────────────────────┘
                                      │
                                      ▼
                      ┌───────────────────────────────┐
                      │    FastAPI Gateway & Server   │
                      │       (Python Async - 8000)   │
                      └───────────────┬───────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌──────────────┐              ┌──────────────┐              ┌──────────────┐
│ PostgreSQL / │              │ Redis Cache  │              │ Celery Task  │
│  PostGIS     │              │  & Pub/Sub   │              │   Workers    │
└──────────────┘              └──────────────┘              └──────────────┘
```

---

## ⚡ Key Technical Design Decisions

### 1. Monorepo Architecture
- **Root npm Workspaces**: Hosts four distinct frontend React applications (`landing`, `passenger`, `driver`, `admin`) sharing standard dependencies (`typescript`, `vite`, `tailwindcss`) for unified builds and single-command startup scripts.
- **Backend Directory (`/backend`)**: Contains the FastAPI server, Alembic migrations, SQLAlchemy models, and Pytest suites.

### 2. Spatial Querying with PostGIS
- Pickup and drop-off coordinates are stored as PostGIS `GEOMETRY(Point, 4326)` objects.
- Spatial index (`ST_DWithin`) executes high-efficiency proximity searches for drivers within dynamic kilometer radii (e.g. 5km radius around passenger pickup location).

### 3. Real-Time Bidding Protocol
1. **Passenger Request**: Passenger posts a ride with a suggested fare.
2. **Geofenced Broadcast**: Backend spatial worker queries PostGIS for online drivers within radius and emits `ride:new_request` via Socket.IO.
3. **Driver Bidding**: Drivers receive request and submit counter-bids via `driver:submit_bid`.
4. **Instant Push**: Socket.IO pushes incoming bids to passenger UI in real time.
5. **Bid Acceptance & Escrow**: Passenger selects winning bid. Wallet service locks fare in escrow and notifies assigned driver.

### 4. Background Workers (Celery + Redis)
- **Ride Expiration**: Bidding sessions automatically expire after 120 seconds if no bid is accepted.
- **Payout Transfers**: Asynchronous background jobs compute weekly driver payouts and generate balance statements.
