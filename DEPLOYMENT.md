# Bid2Ride Deployment Guide

Follow these steps to deploy Bid2Ride in production.

## Step 1: Copy Production Settings
Create `.env` file from the production template:
```bash
cp .env.production.example .env
```
Ensure all database passwords, Secret JWT keys, and third-party keys are replaced with secure random parameters.

## Step 2: Configure Supabase
1. Create a Supabase project at https://supabase.com
2. In the SQL Editor, run the initial migration SQL or run `alembic upgrade head`
3. Enable the PostGIS extension in Supabase Dashboard → Database → Extensions
4. Copy your project credentials:
   - `DATABASE_URL`: Go to Project Settings → Database → Connection string (URI). Add `?sslmode=require` at the end.
   - `SUPABASE_URL`: Project Settings → API → Project URL
   - `SUPABASE_ANON_KEY`: Project Settings → API → anon public key
   - `SUPABASE_SERVICE_ROLE_KEY`: Project Settings → API → service_role key

## Step 3: Set up SSL Certs
Place TLS certificates in `./nginx/certs/`:
*   `./nginx/certs/bid2ride.crt`
*   `./nginx/certs/bid2ride.key`

## Step 4: Run with Docker Compose
To build and launch the production application services:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## Step 5: Run Alembic migrations
Ensure the database schemas are up to date:
```bash
docker-compose -f docker-compose.prod.yml exec web alembic upgrade head
```

## Step 6: Verification Pings
Verify API connectivity using curl commands targeting the health endpoint:
```bash
curl -f http://localhost/health
```
