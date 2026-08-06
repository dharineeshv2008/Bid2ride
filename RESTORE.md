# Bid2Ride Restore Guide

Follow these steps to restore PostgreSQL data and Redis cash states on new installations or during crash recoveries.

## Database Restore

1. Restore into a fresh Supabase project or using Supabase CLI:
```bash
pg_restore --dbname="$DATABASE_URL" --verbose backups/db_backup_2026-07-28.dump
```

## Redis Snapshot Recovery

1. Stop the target Redis container:
```bash
docker-compose -f docker-compose.prod.yml stop redis
```
2. Replace `dump.rdb` in the mounted redis data volume directory with your snapshot file.
3. Restart the Redis container:
```bash
docker-compose -f docker-compose.prod.yml start redis
```
4. Verify keys load correctly using redis ping checks.
