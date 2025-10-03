# Device Session Manager

A full-stack Next.js application for managing internet sessions across multiple devices with automatic failover and real-time tracking.

**Live Demo:** [https://internet-session-managment.vercel.app](https://internet-session-managment.vercel.app)

## Overview

This application simulates an intelligent session management system that automatically switches between devices when failures occur. It tracks data usage, session duration, and provides detailed analytics for each device.

## Key Features

### 🔄 Automatic Device Switching
- Starts sessions with the first available device
- Automatically switches to another device when the current one stops/fails
- Seamless failover with no data loss
- Real-time status updates for all devices

### 📊 Real-Time Session Tracking
- Live session monitoring with 1-second refresh intervals
- Per-device duration and data usage tracking
- Automatic data consumption calculation based on device rates
- Session segments tracking across multiple devices

### 📱 Device Management
- Three pre-configured devices (Device A, B, C) with different data rates
- Device status tracking (available, busy, stopped)
- Individual device profile pages with detailed statistics
- View historical usage and current session data per device

### 📈 Analytics Dashboard
- Session summary with total duration and data usage
- Per-device breakdown of usage statistics
- Real-time updates of ongoing sessions
- Historical data aggregation

### 🗄️ Database-Backed Persistence
- Supabase (PostgreSQL) integration for data persistence
- Row Level Security (RLS) policies for data protection
- Automatic session segment tracking
- Device state management

## Technology Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (PostgreSQL)
- **UI Components:** shadcn/ui with Tailwind CSS v4
- **State Management:** SWR for real-time data fetching
- **TypeScript:** Full type safety
- **Deployment:** Vercel

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account and project

### Installation Steps

1. **Clone or download the project**
   ```bash
   #  clone from GitHub
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Supabase Integration**
- manually set environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

1. **Initialize Database**
   - Run `scripts/sql/001_init.sql` to create tables
   - Run `scripts/sql/002_seed_devices.sql` to seed initial devices

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open Application**
   - Navigate to `http://localhost:3000`

## How It Works

### Session Flow

1. **Start Session:** Click "Start Session" to begin tracking
   - System assigns the first available device
   - Device status changes to "busy"
   - Session segment starts recording

2. **Automatic Switching:** Click "Stop Current Device" to simulate failure
   - Current device marked as "stopped"
   - Session segment closes and data usage calculated
   - System automatically switches to next available device
   - New session segment begins

3. **Real-Time Tracking:** Dashboard updates every second
   - Live data usage calculation for active segments
   - Total duration and data usage across all devices
   - Per-device statistics in summary table

4. **Device Profiles:** Click "View" on any device
   - See total historical usage
   - View last completed session details
   - Monitor current active session (if any)

### Data Calculation

- Each device has a predefined data rate (MB/minute)
- **Device A:** ~3 MB/min
- **Device B:** ~2 MB/min
- **Device C:** ~4 MB/min

Data usage is calculated as: `duration (minutes) × device rate (MB/min)`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/session/start` | Start a new session and assign available device |
| `POST` | `/api/device/stop` | Stop current device and trigger auto-switch |
| `GET` | `/api/session` | Fetch current session summary and statistics |
| `GET` | `/api/devices` | List all devices with current status |
| `POST` | `/api/reset` | Reset demo state (clear all sessions) |

## Database Schema

### Tables

**devices**
- `id` (text, primary key)
- `name` (text)
- `status` (text: available/busy/stopped)
- `mb_per_minute` (numeric)

**sessions**
- `id` (uuid, primary key)
- `started_at` (timestamptz)
- `ended_at` (timestamptz, nullable)

**session_segments**
- `id` (uuid, primary key)
- `session_id` (uuid, foreign key)
- `device_id` (text, foreign key)
- `started_at` (timestamptz)
- `ended_at` (timestamptz, nullable)
- `mb_used` (numeric, nullable)

## Features in Detail

### Session Controls Component
- Start/stop session management
- Device status overview
- Quick access to device profiles
- Reset functionality for demo purposes

### Session Summary Component
- Real-time statistics display
- Per-device usage breakdown
- Total duration and data consumption
- Responsive table layout

### Device Profile Pages
- Individual device statistics
- Historical usage aggregation
- Last session details
- Current active session monitoring

## Development

Built with modern web technologies and best practices:
- Server Components for optimal performance
- Client Components for interactive features
- API Routes for backend logic
- Real-time data synchronization with SWR
- Type-safe database queries
- Responsive design with Tailwind CSS

## Deployment

The application is deployed on Vercel and accessible at:
**[https://internet-session-managment.vercel.app](https://internet-session-managment.vercel.app)**

To deploy your own instance:
1. Push code to GitHub
2. Import project in Vercel
3. Add Supabase environment variables
4. Deploy

