# Changelog

All notable changes to the **Bid2Ride** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-08

### Added
- **Unified Landing Page**: Dynamic product showcase with real-time bidding simulation, ride estimator, role selector, and feature highlights.
- **Passenger App**: Ride request workflow with real-time fare bidding, map route preview, driver proposal comparison, live ride tracking, ride history, wallet balance management, and user profile management.
- **Driver App**: Incoming ride request stream, real-time bid placement interface, active trip navigation with passenger contact, daily earnings analytics with chart visualizations, payout withdrawal workflow, and vehicle documents verification portal.
- **Admin Portal**: Platform dashboard with system metrics, live map tracking active rides, user & driver management table with KYC verification action, ride dispute resolution modal, and financial system audit metrics.
- **FastAPI Async Backend**: High-performance RESTful API powering core business logic:
  - Auth Service with Firebase Phone Auth and JWT token validation.
  - Driver & Passenger service domain layers.
  - Wallet & Payment processing domain supporting wallet top-up, ride fare lock, and escrow payouts.
- **Real-Time WebSockets Engine**: Async Python Socket.IO engine facilitating instant bid broadcasts between passengers and nearby drivers within dynamic spatial radii.
- **PostGIS Geo-Spatial Database**: PostGIS-enabled PostgreSQL database model for high-efficiency proximity searches, geofenced driver discovery, and geospatial trip indexing.
- **Background Worker Task System**: Celery + Redis integration handling asynchronous ride timeout processing, fare settlement background jobs, and automated driver payout transfers.
- **Open-Source Infrastructure**: Complete Docker Compose setup, comprehensive GitHub Actions CI pipeline with Postgres/Redis services, open-source governance documentation (`CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`), and issue templates.
