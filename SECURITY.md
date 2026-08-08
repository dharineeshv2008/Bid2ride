# Security Policy

The **Bid2Ride** team takes the security of our platform and users seriously. We appreciate security researchers and community members reporting potential vulnerabilities responsibly.

---

## Supported Versions

Only the latest release on the `main` branch receives active security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0.0 | :x:                |

---

## Reporting a Vulnerability

> [!IMPORTANT]
> **Please DO NOT open a public GitHub issue to report a security vulnerability.**

If you discover a security issue or vulnerability in Bid2Ride:

1. **Email Us Privately**: Send a detailed report to `security@bid2ride.dev` or use GitHub's **[Private Security Advisory](https://github.com/john2010may/bid2ride/security/advisories/new)** disclosure feature.
2. **Details to Include**:
   - Description of the vulnerability and its potential impact.
   - Proof of Concept (PoC) or step-by-step reproduction guide.
   - Any affected endpoints (e.g., Auth, WebSocket bidding, Payment webhooks).
3. **Response Time**: We will acknowledge receipt of your report within **24 to 48 hours** and provide regular status updates on remediation.

---

## Security Best Practices for Self-Hosting

When deploying Bid2Ride in production:
- **Secrets Management**: Never commit `.env` files or secret keys (`SECRET_KEY`, `FIREBASE_ADMIN_CREDENTIALS`, DB passwords) to source control.
- **SSL/TLS Encryption**: Enforce HTTPS for API endpoints and WSS for Socket.IO WebSockets using Nginx or Caddy.
- **Database Access**: Restrict PostgreSQL access to local Docker container networks.
- **JWT Expiration**: Configure short-lived JWT access tokens and secure refresh token handling.
