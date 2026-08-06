# Bid2Ride Backup Guide

Maintain regular backup schedules to protect production user accounts, transaction ledgers, and audit files.

## Database Backups (Supabase PostgreSQL)

Use `pg_dump` with your Supabase `DATABASE_URL` to create a backup file:
```bash
pg_dump --dbname="$DATABASE_URL" --format=c --file=backups/db_backup_$(date +%F).dump
```

## Redis Backups

Force a Redis snapshot write using:
```bash
docker exec -it bid2ride_redis_prod redis-cli -a ${REDIS_PASSWORD} bgsave
```
The snapshot will write to `dump.rdb` within the mounted data directory.
Copy the file to a secure offsite bucket location.
