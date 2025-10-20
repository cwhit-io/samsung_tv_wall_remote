#!/bin/sh

# Custom entrypoint script for TV Wall Frontend
echo "Starting TV Wall Frontend..."

# Check if we should use standalone mode (no backend proxy)
if [ "$STANDALONE_MODE" = "true" ]; then
    echo "Using standalone nginx configuration (no backend proxy)"
    cp /etc/nginx/templates/nginx-standalone.conf /etc/nginx/nginx.conf
else
    echo "Using nginx configuration with backend proxy"
    cp /etc/nginx/templates/nginx-backend.conf /etc/nginx/nginx.conf
fi

# Check if REACT_APP_API_URL is set for frontend
if [ -n "$REACT_APP_API_URL" ]; then
    echo "Frontend will connect to backend at: $REACT_APP_API_URL"
else
    echo "Warning: REACT_APP_API_URL not set. Frontend may not be able to connect to backend."
fi

# Start nginx as root (nginx will drop privileges for worker processes)
echo "Starting nginx..."
exec nginx -g "daemon off;"