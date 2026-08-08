# Contributing to Bid2Ride

Thank you for your interest in contributing to **Bid2Ride**! We welcome contributions from developers of all skill levels. Whether you are fixing a bug, adding a new feature, improving documentation, or opening an issue, your help is deeply appreciated.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before making contributions.

---

## Quick Start for Contributors

You can set up your local development environment in under 10 minutes:

```bash
# 1. Clone the repository
git clone https://github.com/john2010may/bid2ride.git
cd bid2ride

# 2. Start PostgreSQL and Redis via Docker Compose
docker-compose up -d

# 3. Setup Python Backend
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# 4. In a separate terminal, setup Node.js Workspaces (Frontend apps)
cd ..
npm install
npm run dev --workspaces
```

Refer to the [Detailed Installation Guide](docs/INSTALLATION.md) for step-by-step instructions across all platforms.

---

## How Can I Contribute?

### 1. Reporting Bugs
Check existing [GitHub Issues](https://github.com/john2010may/bid2ride/issues) to avoid duplicates. When opening a new bug report, use the **Bug Report Template** and provide:
- Operating System & Node/Python versions
- Precise steps to reproduce the issue
- Expected vs actual behavior
- Relevant error logs or console stack traces

### 2. Suggesting Features
Enhancement suggestions are managed through [GitHub Issues](https://github.com/john2010may/bid2ride/issues). Please use the **Feature Request Template** to describe the problem and proposed solution.

### 3. Good First Issues
If you are new to the repository, look for issues labeled [`good first issue`](docs/ROADMAP.md#beginner-friendly-issues-good-first-issue). These are curated, well-scoped tasks designed to help new contributors get started.

---

## Development Workflow & Guidelines

### Branch Naming Conventions
Create a feature branch off `main`:
- `feat/feature-name` for new features
- `fix/bug-description` for bug fixes
- `docs/topic-name` for documentation updates
- `refactor/component-name` for code refactoring

### Code Style & Formatting

#### Python (Backend)
- Code must follow **PEP 8**.
- Formatted using `black` and linted with `ruff`:
  ```bash
  cd backend
  black --check app/ tests/
  ruff check app/ tests/
  ```

#### TypeScript / React (Frontend)
- Use **TypeScript** with explicit types (avoid `any`).
- Format with standard Prettier / ESLint rules:
  ```bash
  npm run lint --workspaces
  ```

### Running Tests

Before submitting a Pull Request, ensure all tests pass:

```bash
# Run Backend Pytest Suite
cd backend
pytest tests/ --cov=app

# Run Frontend Workspace Typecheck & Build
cd ..
npm run build
```

---

## Submitting a Pull Request (PR)

1. Fork the repository and create your branch from `main`.
2. Keep your changes focused and atomic.
3. Add tests for any new features or bug fixes.
4. Ensure all automated CI checks pass locally.
5. Open a Pull Request referencing the related Issue (e.g., `Fixes #42`).
6. Fill out the PR template completely.

---

## License

By contributing to Bid2Ride, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
