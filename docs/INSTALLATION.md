# 🚀 Complete Installation Guide

This guide walks you through setting up **Bid2Ride** locally for development or testing in under **10 minutes**.

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **Python 3.11+** (Python 3.13 recommended)
- **Node.js 18+** & **npm 9+**
- **Git**

---

## 🛠️ Step 1: Clone the Repository

```bash
git clone https://github.com/john2010may/bid2ride.git
cd bid2ride
```

---

## 🐳 Step 2: Start Services via Docker Compose

Bid2Ride requires **PostgreSQL with PostGIS** and **Redis**. Start them effortlessly with Docker Compose:

```bash
docker-compose up -d
```

Verify that the containers are healthy:
```bash
docker ps
```
You should see `bid2ride_db` (PostGIS on port 5432) and `bid2ride_redis` (Redis on port 6379) running.

---

## 🐍 Step 3: Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```

3. Install dependencies:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. Configure Environment Variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   *The default `.env.example` comes pre-configured for Docker Compose local PostgreSQL and Redis.*

5. Run Alembic Database Migrations:
   ```bash
   alembic upgrade head
   ```

6. Start the FastAPI Development Server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

The backend interactive API documentation is now live at:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## ⚡ Step 4: Frontend Workspaces Setup (React + Vite)

In a new terminal window from the repository root:

1. Install npm dependencies across all workspaces (`landing`, `passenger`, `driver`, `admin`):
   ```bash
   npm install
   ```

2. Start all frontend applications concurrently:
   - **Windows PowerShell**:
     ```powershell
     .\run_dev.ps1
     ```
   - **Linux / macOS / Cross-Platform**:
     ```bash
     npm run dev --workspaces
     ```

---

## 🌐 Application Port Map

| Application | Technology | Local URL |
| ----------- | ---------- | --------- |
| **Landing Page** | React / Vite | `http://localhost:5173` |
| **Passenger App** | React / Vite | `http://localhost:5174` |
| **Driver App** | React / Vite | `http://localhost:5175` |
| **Admin Portal** | React / Vite | `http://localhost:5176` |
| **FastAPI Backend** | Python / AsyncPG | `http://localhost:8000` |
| **Swagger API Docs**| OpenAPI 3.0 | `http://localhost:8000/docs` |

---

## 🧪 Verifying the Setup

Run the Pytest suite to ensure everything is operating cleanly:

```bash
cd backend
pytest tests/
```
