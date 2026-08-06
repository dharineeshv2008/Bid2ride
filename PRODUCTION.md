# Bid2Ride Production Guide

This guide describes production configurations, scalability, performance optimizations, and baseline service architectures.

## Architecture Guidelines

*   **REST/WS Separations:** Ensure mobile clients target only `/api/v1/` routes and WebSocket Socket.IO connections.
*   **Database Layers:** Use Supabase PostgreSQL with PostGIS extensions for spatial lookups and `ride_tracking` streams.
*   **Redis Cache Layer:** Cache ride requests status transitions and driver geographic pings.

## Performance Configurations

*   **Connection Pools:** Configure Supabase connection pool settings via `DATABASE_URL` with appropriate pool sizes.
*   **Nginx Upstream Scaling:** Route requests across multiple backend Gunicorn/Uvicorn processes.
*   **Celery Concurrency:** Run background notification tasks on a dedicated worker group using concurrency settings based on system memory capacity.
