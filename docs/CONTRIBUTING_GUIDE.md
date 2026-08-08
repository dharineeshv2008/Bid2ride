# 👩‍💻 Detailed Developer & Contributing Guide

Welcome to the developer guide for **Bid2Ride**! This document provides technical insights for contributors extending the codebase.

---

## 📁 Repository Structure Overview

```
bid2ride/
├── backend/                  # FastAPI Python Service
│   ├── app/
│   │   ├── api/v1/          # REST Endpoint Routers (Auth, Drivers, Passengers, Wallet, Admin)
│   │   ├── core/            # Config, Security, DB Engine Session setup
│   │   ├── db/              # Alembic migrations & Base models
│   │   ├── models/          # SQLAlchemy ORM models (User, Ride, Bid, Wallet)
│   │   ├── repositories/    # Data access layer
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── services/        # Business domain logic
│   │   └── websockets/      # Socket.IO event handlers & connection managers
│   └── tests/               # Pytest integration & unit test suite
├── frontend/                 # React + TypeScript Monorepo
│   ├── admin/               # Platform Admin Dashboard
│   ├── driver/              # Driver App (Bidding, Active Trips, Earnings)
│   ├── landing/             # Marketing & Product Showcase Site
│   └── passenger/           # Passenger App (Ride Bidding, Live Tracking, Wallet)
├── docs/                     # Comprehensive Project Documentation
├── .github/                  # Workflows, Issue & PR Templates, Dependabot
├── docker-compose.yml        # Development Docker setup
└── package.json              # Monorepo Workspaces Configuration
```

---

## 🔨 Development Standards

### 1. Database Migrations (Alembic)
When modifying models in `backend/app/models/`:
1. Generate migration script:
   ```bash
   cd backend
   alembic revision --autogenerate -m "describe changes"
   ```
2. Inspect generated script under `backend/alembic/versions/`.
3. Apply migration:
   ```bash
   alembic upgrade head
   ```

### 2. Testing Practices
- Every new endpoint or service function must include a corresponding unit or integration test in `backend/tests/`.
- Frontend components should be typed strictly with TypeScript interfaces located in `src/types/index.ts`.
