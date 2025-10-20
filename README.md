# Samsung TV Controller

A web-based remote control for managing multiple Samsung TVs on your network. Control power, volume, channels, navigation, and more from a modern, responsive interface.

## Features

- 5x3 grid layout for up to 15 TVs (T1-T5, M1-M5, B1-B5)
- Bulk control: power, volume, channel, mute, menu, home, source, info, navigation, numeric keypad, WOL, and exit
- Responsive design for desktop and mobile
- FastAPI backend for concurrent TV command execution
- Easy TV selection and bulk operations

## Project Structure

```
samsung-tv-controller/
├── backend/
│   ├── main.py              # FastAPI backend
│   ├── samsung_controller.py
│   ├── tv_info.json         # TV configuration (ignored by git)
│   ├── tv_info.json.example # Example config
│   ├── tv_keys.json         # Key mapping
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   └── App.tsx          # Main React app
│   ├── public/
│   ├── package.json         # Frontend dependencies
│   └── README.md            # (You are here)
```

## Getting Started

### Backend (Python/FastAPI)

1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. Copy the example config and edit for your TVs:
   ```bash
   cp tv_info.json.example tv_info.json
   # Edit tv_info.json with your TV details
   ```
3. Start the backend server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend (React)

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
2. Start the development server:
   ```bash
   npm start
   ```
3. Open your browser to `http://localhost:3000`

## Usage

- Select TVs from the grid (T1-T5, M1-M5, B1-B5)
- Use the remote control UI to send commands to selected TVs
- All commands are sent concurrently for fast bulk control

## API Endpoints

The FastAPI backend provides the following REST endpoints:

### Core Endpoints

- **GET** `/` - API information and detected functions
- **GET** `/health` - Health check endpoint for monitoring
- **GET** `/tvs` - Get all discovered/configured TVs
- **GET** `/commands` - Get all available TV commands/keys
- **POST** `/bulk-command` - Execute command on multiple TVs concurrently

### Management Endpoints

- **GET** `/functions` - Get all detected functions from samsung_controller module
- **GET** `/debug/{ip}` - Detailed debug information for a specific TV

### API Documentation

When the backend is running, visit:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Example API Usage

```bash
# Get all TVs
curl http://localhost:8000/tvs

# Get available commands
curl http://localhost:8000/commands

# Send power-on to multiple TVs
curl -X POST http://localhost:8000/bulk-command \
  -H "Content-Type: application/json" \
  -d '{"ips": ["10.10.97.138", "10.10.97.78"], "command": "power-on"}'

# Send volume up to all selected TVs
curl -X POST http://localhost:8000/bulk-command \
  -H "Content-Type: application/json" \
  -d '{"ips": ["10.10.97.138"], "command": "KEY_VOLUP"}'
```

## Docker Deployment

### Using Pre-built Images

The easiest way to deploy is using the pre-built Docker images:

```bash
# Using production compose file
docker-compose -f docker-compose.prod.yml up -d

# Or manually with Docker/Podman
docker run -d --name tv-wall-backend \
  -p 8000:8000 \
  -v ./backend/tv_info.json:/app/tv_info.json:ro \
  -v ./backend/tv_keys.json:/app/tv_keys.json:ro \
  cwhitio/tv-wall-backend:latest

docker run -d --name tv-wall-frontend \
  -p 3000:80 \
  -e REACT_APP_API_URL=http://localhost:8000 \
  cwhitio/tv-wall-frontend:latest
```

### Docker Hub Repositories

- **Backend**: [cwhitio/tv-wall-backend](https://hub.docker.com/r/cwhitio/tv-wall-backend)
- **Frontend**: [cwhitio/tv-wall-frontend](https://hub.docker.com/r/cwhitio/tv-wall-frontend)

### Building Locally

If you prefer to build the images yourself:

```bash
# Build both images
docker-compose build

# Or build individually
docker build -t tv-wall-backend ./backend
docker build -t tv-wall-frontend ./frontend

# Run with docker-compose
docker-compose up -d
```

## Configuration

- Edit `backend/tv_info.json` to add or update TV details (see `tv_info.json.example`)
- Key mappings can be customized in `backend/tv_keys.json`

## Notes

- The backend must be accessible from the frontend (update API_BASE in App.tsx if needed)
- `tv_info.json` is ignored by git for privacy; use the example file for sharing configs
- For production deployment, mount your TV configuration files as volumes

## License

MIT
