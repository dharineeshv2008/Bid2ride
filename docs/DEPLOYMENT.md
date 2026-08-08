# 🚀 Deployment Guide

This guide explains how to deploy **Bid2Ride** into production environments using Docker Compose, reverse proxies, and cloud platforms (Vercel / Render / AWS).

---

## 🐳 Option 1: Full Docker Compose Production Deployment

Use `docker-compose.prod.yml` to orchestrate Nginx, FastAPI backend, PostgreSQL/PostGIS, and Redis on a single VPS (DigitalOcean, AWS EC2, Hetzner, Linode).

### 1. Prepare Environment Configuration
Create a `.env.production` file on your server:

```env
POSTGRES_USER=bid2ride_prod_user
POSTGRES_PASSWORD=YOUR_STRONG_DB_PASSWORD
POSTGRES_DB=bid2ride_prod_db
SECRET_KEY=YOUR_64_CHAR_SECRET_KEY
REDIS_URL=redis://redis:6379/0
ENVIRONMENT=production
ALLOWED_HOSTS=api.yourdomain.com,app.yourdomain.com
```

### 2. Launch Stack
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## ☁️ Option 2: Hybrid Deployment (Vercel + Render / Managed DB)

### Frontend (Vercel)
The root repository includes `vercel.json` configured for Vercel serverless builds:
1. Import the GitHub repository into **Vercel**.
2. Vercel automatically detects the npm workspaces (`frontend/landing`, `frontend/passenger`, `frontend/driver`, `frontend/admin`).
3. Set environment variable:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com
   ```

### Backend (Render / Railway / AWS App Runner)
1. Deploy the `backend/Dockerfile` as a Web Service.
2. Connect a managed PostgreSQL database with **PostGIS** extension enabled (e.g. AWS RDS or Supabase).
3. Connect a managed Redis cluster (e.g. Upstash or AWS ElastiCache).
4. Run Alembic migrations during build step:
   ```bash
   alembic upgrade head
   ```

---

## 🔒 Nginx Reverse Proxy & SSL Setup

A template Nginx configuration is available in `nginx/default.conf` forwarding requests:
- `/api/` -> `http://127.0.0.1:8000`
- `/socket.io/` -> `http://127.0.0.1:8000` with WebSocket Upgrade headers.
