#!/bin/bash

# Docker Hub Build and Push Script
# Run this on a machine with sufficient disk space

echo "Building and pushing Samsung TV Controller Docker images..."

# Build and push backend
echo "Building backend image..."
docker build -t cwhitio/tv-wall-backend:latest ./backend

echo "Pushing backend image..."
docker push cwhitio/tv-wall-backend:latest

# Build and push frontend
echo "Building frontend image..."
docker build -t cwhitio/tv-wall-frontend:latest ./frontend

echo "Pushing frontend image..."
docker push cwhitio/tv-wall-frontend:latest

echo "Both images have been built and pushed successfully!"
echo ""
echo "Backend: https://hub.docker.com/r/cwhitio/tv-wall-backend"
echo "Frontend: https://hub.docker.com/r/cwhitio/tv-wall-frontend"
echo ""
echo "To deploy, run:"
echo "docker-compose -f docker-compose.prod.yml up -d"