# Bid2Ride – Backend Foundation

This directory houses the foundational infrastructure components for the **Bid2Ride** backend service.

---

## 1. Local Development Setup

### 1.1 Prerequisites
*   Python 3.13+ installed locally.
*   Docker and Docker Compose installed.

### 1.2 Setup Environment
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment and activate it:
    ```bash
    python -m venv venv
    # Windows PowerShell:
    .\venv\Scripts\Activate.ps1
    # Linux/MacOS:
    source venv/bin/activate
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Copy environment configurations:
    ```bash
    copy .env.example .env
    ```

---

## 2. Running the Infrastructure

### 2.1 Start Postgres & Redis (Local Docker Sandbox)
To spin up the datastore dependencies without running the app in a container:
```bash
docker-compose up -d postgres redis
```

### 2.2 Run Database Migrations
Initialize and run migration tables:
```bash
alembic upgrade head
```

### 2.3 Start FastAPI App (Hot Reload)
```bash
uvicorn app.main:app --reload --port 8000
```

Verify in your browser:
*   API Index: [http://localhost:8000/](http://localhost:8000/)
*   Health Check: [http://localhost:8000/health](http://localhost:8000/health)
*   Interactive Swagger API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 3. Running Containerized Deployments

To build and launch the complete stack (Postgres + Redis + Backend + Nginx load balancer):
```bash
docker-compose up --build -d
```
The application will be accessible through the reverse proxy at [http://localhost/](http://localhost/).
