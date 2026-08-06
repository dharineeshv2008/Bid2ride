# Bid2Ride Failure Runbook

Troubleshoot and resolve operational service errors by executing these standard recovery runbook steps.

## Scenario 1: Redis Cache Connection Loss

*   **Symptoms:** WebSocket connections dropping, driver GPS coordinates caching failures.
*   **Resolution:**
    1. Check Redis container health status:
       ```bash
       docker ps | grep bid2ride_redis_prod
       ```
    2. Restart Redis container instance:
       ```bash
       docker-compose -f docker-compose.prod.yml restart redis
       ```
    3. Verify connection recovery from logs.

## Scenario 2: Supabase Database Deadlocks

*   **Symptoms:** API requests timing out, passenger bookings failures.
*   **Resolution:**
    1. Connect to Supabase SQL editor or use `psql` with your `DATABASE_URL`:
    2. Inspect active SQL transactions:
       ```sql
       SELECT pid, age(clock_timestamp(), query_start), query, state FROM pg_stat_activity WHERE state != 'idle';
       ```
    3. Terminate deadlocked query process IDs:
       ```sql
       SELECT pg_terminate_backend(pid);
       ```
