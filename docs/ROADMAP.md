# 🗺️ Project Roadmap & Good First Issues

This roadmap outlines the past milestones, current status, and future technical vision for **Bid2Ride**.

---

## 📅 Roadmap Overview

### Milestone 1.0 — Core Platform Release (Current)
- [x] Monorepo setup with 4 React apps (`landing`, `passenger`, `driver`, `admin`).
- [x] FastAPI async backend with Alembic migrations.
- [x] Real-time bidding engine over Socket.IO WebSockets.
- [x] PostGIS spatial driver location tracking.
- [x] Wallet balance & fare escrow transaction system.
- [x] Complete Open-Source governance & CI pipeline setup.

### Milestone 1.1 — Enhanced Mobility & Real-Time Maps (Q3 2026)
- [ ] **Leaflet / Mapbox Live Route Overlay**: Dynamic animated polyline navigation between pickup and dropoff coordinates.
- [ ] **Push Notification Gateway**: Firebase Cloud Messaging (FCM) integration for background bid alerts when apps are minimized.
- [ ] **Multi-Stop Rides**: Support passengers adding intermediate stops to ride requests.

### Milestone 1.2 — Financial & Multi-Currency System (Q4 2026)
- [ ] **Stripe / Razorpay Payment Gateway Integration**: Live credit card & UPI wallet top-up integration.
- [ ] **Multi-Currency Support**: Dynamic currency switching & regional fare pricing algorithms.
- [ ] **Automated Driver KYC Verification**: AI-assisted driver license & vehicle registration document OCR scanning.

---

## 🌱 Beginner-Friendly Issues ("good first issue")

We specifically reserve easy-to-pickup issues to help new contributors get involved! Here is our curated backlog of `good first issue` tasks:

| Issue ID | Category | Title & Description | Difficulty |
| -------- | -------- | ------------------- | ---------- |
| `#GFI-01` | Frontend | **Add Dark/Light Theme Toggle to Landing Page**: Implement theme switcher in `frontend/landing` using CSS variables. | 🟢 Easy |
| `#GFI-02` | Backend | **Add Endpoint Health Check Metadata**: Expose server uptime and active database connection pool stats on `GET /api/v1/health`. | 🟢 Easy |
| `#GFI-03` | Docs | **Add Postman / Insomnia Collection export under `/docs/postman`**: Create an exported API collection file with environment presets. | 🟢 Easy |
| `#GFI-04` | Frontend | **Driver Earnings Chart Filter Buttons**: Add 7-day, 30-day, and 1-year time range filter buttons on `frontend/driver/src/pages/EarningsPage.tsx`. | 🟢 Easy |
| `#GFI-05` | Backend | **Validate Minimum Fare Threshold**: Add Pydantic field validator ensuring `suggested_fare >= $5.00` in `backend/app/schemas/passenger.py`. | 🟢 Easy |

> **Interested in taking up a task?** Leave a comment on the corresponding issue on GitHub expressing interest!
