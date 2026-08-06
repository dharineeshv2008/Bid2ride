# Bid2Ride Development Setup & Startup Helper

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Starting Bid2Ride Backend Foundation Environment..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Spin up Database & Redis cache containers
Write-Host "1. Starting Docker containers (PostgreSQL & Redis)..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Wait for containers to start
Start-Sleep -Seconds 3

# 2. Activate virtualenv and check dependencies
Write-Host "2. Verifying local Python environment..." -ForegroundColor Yellow
if (-not (Test-Path "backend\venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Green
    python -m venv backend\venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Green
. backend\venv\Scripts\Activate.ps1

Write-Host "Installing/updating dependencies..." -ForegroundColor Green
pip install -r backend\requirements.txt

# 3. Copy .env file if it doesn't exist
if (-not (Test-Path "backend\.env")) {
    Write-Host "Copying .env configuration file..." -ForegroundColor Green
    Copy-Item "backend\.env.example" "backend\.env"
}

# 4. Check migrations
Write-Host "3. Running database migrations..." -ForegroundColor Yellow
Set-Location backend
alembic upgrade head
Set-Location ..

# 5. Start development servers
Write-Host "4. Starting local Uvicorn FastAPI server..." -ForegroundColor Yellow
Write-Host "Visit: http://localhost:8000/docs for Swagger API UI" -ForegroundColor Green

Write-Host "  [Landing Website]    http://localhost:5173" -ForegroundColor Green
Write-Host "  [Passenger Frontend] http://localhost:3000" -ForegroundColor Green
Write-Host "  [Driver Frontend]    http://localhost:3001" -ForegroundColor Green
Write-Host "  [Admin Frontend]     http://localhost:3002" -ForegroundColor Green

# Launch each frontend in its own console window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend/landing; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend/passenger; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend/driver; npm run dev"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend/admin; npm run dev"


# Run backend in the foreground
Set-Location backend
uvicorn app.main:app --reload --port 8000


