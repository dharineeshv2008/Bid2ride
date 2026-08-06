# Bid2Ride Operations Guide

Maintain high service availabilities by monitoring system health, task execution queues, and telemetry logs.

## Logging Analysis

Logs are output as structured JSON objects. Parse logs using search tools:
```bash
docker-compose -f docker-compose.prod.yml logs -f web | grep "status_code=500"
```

## Telemetry Metrics

Check the health telemetry endpoints regularly:
*   `/health` (liveness/readiness verification checks)
*   `/api/v1/admin/system-health` (detailed server diagnostic counters)
