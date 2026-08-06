# Bid2Ride Security Guide

We enforce strict security compliance guidelines across all code bases, token layers, and endpoints.

## JWT Signatures and Rotation

*   **Access Tokens:** Enforced expiry of 30 minutes, signature verification with `HS256`, and RBAC claim structures validations.
*   **Refresh Token Rotation (RTR):** One-time usage policy with automatic session revocation upon reuse attempts. Hashed SHA-256 tokens are stored in the database.

## API Limits

*   **Rate Limits:** Enforced via Nginx at 15 requests/second per IP address, with burst capacities up to 30 requests.
*   **Request Validations:** Enforce strict Pydantic v2 validations on payload schemas.
*   **Role Permissions:** Validate RBAC roles (`PASSENGER`, `DRIVER`, `ADMIN`, `SUPPORT`) inside auth dependencies.
