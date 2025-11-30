# Docker Build and Push Script for Windows PowerShell
# Run this after starting Docker Desktop

Write-Host "Building and pushing Samsung TV Controller Docker images..." -ForegroundColor Green

# Build and push backend
Write-Host "Building backend image..." -ForegroundColor Yellow
docker build -t cwhitio/tv-wall-backend:latest .\backend

Write-Host "Pushing backend image..." -ForegroundColor Yellow
docker push cwhitio/tv-wall-backend:latest

# Build and push frontend
Write-Host "Building frontend image..." -ForegroundColor Yellow
docker build -t cwhitio/tv-wall-frontend:latest .\frontend

Write-Host "Pushing frontend image..." -ForegroundColor Yellow
docker push cwhitio/tv-wall-frontend:latest

Write-Host "Both images have been built and pushed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: https://hub.docker.com/r/cwhitio/tv-wall-backend" -ForegroundColor Cyan
Write-Host "Frontend: https://hub.docker.com/r/cwhitio/tv-wall-frontend" -ForegroundColor Cyan
Write-Host ""
Write-Host "To deploy, run:" -ForegroundColor White
Write-Host "docker-compose -f docker-compose.prod.yml up -d" -ForegroundColor White