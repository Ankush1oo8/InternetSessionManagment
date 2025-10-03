# Device Session Manager

A tiny Next.js App Router demo that:
- Starts a session and assigns one available device
- Automatically switches to another available device if the current device stops
- Shows a Session Summary (device(s), durations, rough data used)

Now backed by Supabase (Postgres) instead of in-memory state.

## Run (5 Steps)
1) Run scripts/sql/001_init.sql, then scripts/sql/002_seed_devices.sql from the Scripts panel to create tables and seed devices.  
2) Open the Preview for this version (or click “Publish” to deploy to Vercel).  
3) Navigate to the app root (/) to load the dashboard.  
4) Click “Start Session” to allocate an available device; click “Stop Current Device” to simulate a failure (auto-switch occurs).  
5) View “Session Summary” for per-device durations and rough data usage; use “Reset Demo” to clear state.

## API Endpoints
- POST /api/session/start — start a session and assign an available device
- POST /api/device/stop — stop the current device and auto-switch
- GET  /api/session — fetch current summary
- GET  /api/devices — list devices
- POST /api/reset — reset all demo state
