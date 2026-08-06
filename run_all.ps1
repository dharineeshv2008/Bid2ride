# Bid2Ride Ecosystem Unified Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Launching Bid2Ride Real-Time Bidding Platform Ecosystem" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Step 0: Ensure frontends are built for Nginx to serve
Write-Host "`n[0/5] Verifying built frontend distributions..." -ForegroundColor Yellow
$apps = @("landing", "passenger", "driver", "admin")
foreach ($app in $apps) {
    $appDir = "$PSScriptRoot\frontend\$app"
    $distPath = "$appDir\dist"
    if (-not (Test-Path "$appDir\node_modules")) {
        Write-Host "Installing dependencies for $app..." -ForegroundColor Green
        Set-Location -Path $appDir
        npm install
    }
    if (-not (Test-Path $distPath)) {
        Write-Host "Building $app frontend..." -ForegroundColor Green
        Set-Location -Path $appDir
        npm run build
    } else {
        Write-Host "✅ $app frontend is already built." -ForegroundColor Gray
    }
}
Set-Location -Path "$PSScriptRoot"

# Step 1: Start Docker Infrastructure Services
Write-Host "`n[1/5] Starting Docker Containers (Postgres+PostGIS, Redis, Celery, Nginx)..." -ForegroundColor Yellow
docker-compose up -d


# Step 2: Apply Database Alembic Migrations
Write-Host "`n[2/5] Running Alembic Database Schema Migrations..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
alembic upgrade head
Set-Location -Path "$PSScriptRoot"

# Step 3: Information Output
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "✅ Bid2Ride Ecosystem Services Initialized!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "📍 FastAPI REST Backend:       http://localhost:8000/api/v1" -ForegroundColor White
Write-Host "📍 Swagger OpenAPI Docs:      http://localhost:8000/docs" -ForegroundColor White
Write-Host "🌐 Unified Landing Website:    http://localhost:5173" -ForegroundColor White
Write-Host "📱 Passenger Frontend UI:      http://localhost:3000" -ForegroundColor White
Write-Host "⚡ Driver Pilot Console UI:    http://localhost:3001" -ForegroundColor White
Write-Host "🛡️ Admin Control Panel UI:    http://localhost:3002" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
