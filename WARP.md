# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**AutoVolt** is a comprehensive IoT classroom automation system for educational institutions with real-time monitoring, intelligent power management, and AI-driven analytics. The system uses ESP32 microcontrollers to control classroom appliances via MQTT, with a React frontend, Node.js/Express backend, MongoDB database, and Python-based AI/ML microservice.

## Development Commands

### Frontend Development
```powershell
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Build for development (with debug info)
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Backend Development
```powershell
# Navigate to backend directory first
cd backend

# Start backend in development mode (with auto-reload)
npm run dev

# Start backend in production mode
npm start

# Run all tests
npm test

# Run specific test suites
npm run test:auth
npm run test:device
npm run test:permission
npm run test:integration
npm run test:unit

# Run tests with coverage
npm run test:coverage

# CI-friendly test run
npm run test:ci
```

### AI/ML Service
```powershell
# Navigate to AI/ML service directory
cd ai_ml_service

# Install Python dependencies
pip install -r requirements.txt

# Start AI/ML service (default port 8002)
python main.py
```

### Docker Operations
```powershell
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Start monitoring stack (Grafana/Prometheus)
docker-compose -f docker-compose.monitoring.yml up -d

# Rebuild and start specific service
docker-compose up --build backend
```

### ESP32 Development
```powershell
# Build and upload ESP32 firmware (using PlatformIO)
pio run --target upload

# Monitor ESP32 serial output
pio device monitor --baud 115200
```

## Architecture Overview

### System Components

**Frontend (React + Vite)**
- **Entry Point**: `src/main.tsx` → `src/App.tsx`
- **Routing**: React Router v6 with lazy-loaded pages for performance
- **State Management**: React Context API + TanStack Query for server state
- **UI Components**: Radix UI primitives + custom components in `src/components/ui/`
- **Real-time Updates**: Socket.IO client (`src/services/socket.ts`)
- **API Communication**: Axios wrapper (`src/services/api.ts`)

**Backend (Node.js/Express)**
- **Entry Point**: `backend/server.js`
- **Database**: MongoDB with Mongoose ODM
- **Real-time**: Socket.IO server for WebSocket connections
- **MQTT**: Dual broker setup:
  - Internal Aedes broker for backend-frontend communication
  - External Mosquitto broker for ESP32 device communication
- **Architecture Pattern**: Controller → Service → Model
  - Controllers: `backend/controllers/`
  - Services: `backend/services/`
  - Models: `backend/models/`
  - Routes: `backend/routes/`

**AI/ML Service (Python/FastAPI)**
- **Entry Point**: `ai_ml_service/main.py`
- **Port**: 8002
- **Features**: Energy forecasting, anomaly detection, schedule optimization
- **ML Models**: Scikit-learn (LinearRegression, IsolationForest)

**ESP32 Firmware (Arduino/PlatformIO)**
- **Source**: `esp32/` directory
- **Framework**: Arduino
- **Communication**: MQTT protocol
- **Topic Structure**: 
  - `esp32/state` - Device status updates
  - `esp32/command` - Commands from backend
  - `esp32/{mac}/control` - Device-specific control

### Communication Flow

```
ESP32 Devices ←→ Mosquitto MQTT ←→ Backend ←→ Socket.IO ←→ React Frontend
                                      ↓
                                   MongoDB
                                      ↓
                                AI/ML Service
```

**Device Control Flow**:
1. User interacts with frontend (switch toggle)
2. Frontend emits Socket.IO event to backend
3. Backend publishes MQTT message to Mosquitto
4. ESP32 receives MQTT message and controls relay
5. ESP32 publishes state update back via MQTT
6. Backend receives state update and broadcasts via Socket.IO
7. Frontend receives update and refreshes UI

### Key Architectural Patterns

**Real-time State Synchronization**:
- Backend maintains authoritative state in MongoDB
- ESP32 devices report state changes via MQTT `esp32/state` topic
- Backend validates device secrets before accepting state updates
- State changes broadcast to all connected clients via Socket.IO
- Frontend components subscribe to relevant Socket.IO events

**Authentication & Authorization**:
- JWT-based authentication with refresh tokens
- Role-based permissions (Admin, Manager, Teacher, User)
- Device-level permissions for granular access control
- Token stored in localStorage with automatic refresh on 401

**Device Secret Validation**:
- Each ESP32 has a unique `deviceSecret` (stored in DB, select: false by default)
- ESP32 includes secret in MQTT state updates
- Backend validates secret before accepting state changes
- Prevents unauthorized devices from controlling switches

**Schedule Execution**:
- Node-cron scheduler runs in backend (`backend/services/scheduleService.js`)
- Schedules stored in MongoDB with time-based rules
- Manual override flag allows physical button control to take precedence
- Schedule service publishes MQTT commands when conditions match

## Critical Development Notes

### Environment Configuration

**Required Environment Variables** (backend/.env):
```bash
# Database
MONGODB_URI=mongodb://localhost:27017/autovolt

# Security
JWT_SECRET=your_secret_minimum_32_chars
JWT_EXPIRE=7d

# Server
PORT=3001
NODE_ENV=development

# MQTT (for ESP32 communication)
MQTT_BROKER=localhost
MQTT_PORT=1883

# Telegram Bot (optional)
TELEGRAM_BOT_TOKEN=your_bot_token

# AI/ML Service
AI_ML_SERVICE_URL=http://localhost:8002
```

**Frontend Environment** (.env):
```bash
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WEBSOCKET_URL=http://localhost:3001
VITE_AI_ML_SERVICE_URL=http://localhost:8002
```

### Port Configuration

- **Frontend Dev Server**: 5173 (Vite default)
- **Backend API**: 3001
- **MongoDB**: 27017
- **MQTT Mosquitto**: 1883
- **MQTT WebSocket**: 9001
- **AI/ML Service**: 8002
- **Grafana**: 3000
- **Prometheus**: 9090
- **Redis**: 6379

### Development Workflow

**When adding new device features**:
1. Update device model in `backend/models/Device.js`
2. Add controller logic in `backend/controllers/deviceController.js`
3. Create/update route in `backend/routes/devices.js`
4. Update frontend types in `src/types/`
5. Update API service in `src/services/api.ts`
6. Create/update UI components as needed
7. Test ESP32 firmware changes if hardware interaction involved

**When modifying MQTT communication**:
1. Backend MQTT handler is in `backend/server.js` (lines 14-300)
2. ESP32 publishes to `esp32/state` with payload: `{mac, secret, switches: [{gpio, state, manual_override}]}`
3. Backend validates MAC address and secret before accepting
4. State changes trigger Socket.IO broadcasts to frontend
5. Always include `deviceSecret` in ESP32 state updates

**When working with real-time features**:
1. Backend Socket.IO setup is in `backend/server.js` (search for "Socket.IO server")
2. Frontend Socket.IO client is in `src/services/socket.ts`
3. Context wrapper is in `src/context/SocketContext.tsx`
4. Subscribe to events in components using `useSocket()` hook
5. Always handle connection/disconnection gracefully

### Database Schema Notes

**Device Model** (`backend/models/Device.js`):
- `macAddress`: Unique identifier (stored normalized: lowercase, no colons)
- `deviceSecret`: Sensitive field (select: false by default)
- `switches`: Array of switch configurations with GPIO mappings
- `status`: 'online' | 'offline' | 'error'
- `lastSeen`: Timestamp of last communication
- Each switch has: `gpio`, `relayGpio`, `buttonGpio`, `state`, `manualOverride`

**Schedule Model**:
- Cron-like time specifications
- Target devices or device groups
- Time-based conditions (day, time range)
- Active/inactive toggle

**Activity Log Model**:
- Tracks all system actions
- User attribution
- Device and switch associations
- Timestamp and action type

### Testing Strategy

**Backend Tests**:
- Unit tests for models and utilities
- Integration tests for API endpoints
- Use Jest + Supertest
- Mock MongoDB with in-memory database
- Test file naming: `*.test.js`

**Frontend Tests**:
- Component tests with React Testing Library
- Use Jest + jsdom environment
- Test file location: `src/components/__tests__/`
- Focus on user interactions and state changes

**ESP32 Testing**:
- Serial monitor debugging (115200 baud)
- MQTT message inspection using MQTT Explorer
- Hardware-in-loop testing with physical relays

### Common Gotchas

1. **MAC Address Normalization**: Backend normalizes MAC addresses (removes colons, lowercase). Ensure ESP32 reports MAC in consistent format.

2. **Socket.IO in Development**: Vite dev server requires Socket.IO client to connect directly to backend port (3001), not through Vite proxy.

3. **MQTT Broker Confusion**: Two MQTT brokers run simultaneously:
   - Aedes (embedded in backend) for internal use
   - Mosquitto (external) for ESP32 communication
   - ESP32 devices connect to Mosquitto on port 1883

4. **Device Secret Security**: Never expose `deviceSecret` in API responses unless explicitly requested with `includeSecret=1` query param and proper admin authentication.

5. **Manual Override Logic**: When `manualOverride` flag is true on a switch, scheduled commands should be ignored. Physical button press sets this flag.

6. **MongoDB Connection**: Backend has fallback connection logic. Check logs if connection fails. Common issue: MongoDB not running.

7. **JWT Refresh**: Frontend automatically refreshes expired tokens. Handle 401 errors gracefully and redirect to login only after refresh attempt fails.

8. **Grafana Embedding**: Grafana dashboards embedded in frontend require CORS configuration in Grafana settings. Check `docker-compose.yml` for required environment variables.

## Project-Specific Conventions

- **File Naming**: 
  - React components: PascalCase (e.g., `DeviceCard.tsx`)
  - Utilities/services: camelCase (e.g., `api.ts`, `socket.ts`)
  - Backend files: camelCase (e.g., `deviceController.js`)
  
- **Import Paths**: Frontend uses `@/` alias for `src/` directory

- **Component Structure**: 
  - UI primitives in `src/components/ui/`
  - Feature components in `src/components/`
  - Pages in `src/pages/`
  - Hooks in `src/hooks/`

- **API Error Handling**: Use consistent error structure: `{error, message, code}`

- **Logging**: Backend uses Winston logger. Use appropriate log levels (error, warn, info, debug).

- **Permissions**: Check user permissions before rendering UI or processing API requests. Use `usePermissions()` hook in frontend.

## Additional Documentation

Comprehensive guides available in root directory:
- `ESP32_MOTION_SENSOR_IMPLEMENTATION.md` - PIR sensor integration
- `VOICE_BOT_ARCHITECTURE.md` - Voice assistant setup
- `TELEGRAM_BOT_SETUP.md` - Telegram bot configuration
- `POWER_SETTINGS_QUICK_START.md` - Energy monitoring features
- `GRAFANA_WORKING_QUERIES.txt` - Grafana dashboard queries

For detailed README and setup instructions, see `README.md`.
