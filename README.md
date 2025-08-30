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
│   ├── samsung_controller_2.py
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

## Configuration

- Edit `backend/tv_info.json` to add or update TV details (see `tv_info.json.example`)
- Key mappings can be customized in `backend/tv_keys.json`

## Notes

- The backend must be accessible from the frontend (update API_BASE in App.tsx if needed)
- `tv_info.json` is ignored by git for privacy; use the example file for sharing configs

## License

MIT
