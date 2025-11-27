# AutoVolt - AI Coding Agent Instructions

## System Architecture Overview

AutoVolt is an intelligent IoT classroom automation system with a multi-layer architecture:

```
React Frontend (5173) ←→ Node.js/Express Backend (3001) ←→ MongoDB
                              ↕                          ↕
                    MQTT Broker (1883)            Socket.IO WebSocket
                              ↓
                    ESP32 IoT Devices
                    
Monitoring Stack: Prometheus (9090) → Grafana (3000) → Custom Dashboards
AI/ML Service: FastAPI (8002) → Energy Forecasting & Anomaly Detection
External: Telegram Bot ↔ Webhook Integration
```

**Key Decision**: Device-centric architecture with switches as embedded sub-documents enables atomic operations and simplifies permission checks.

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI + React Query
- **Backend**: Node.js + Express + Socket.IO + MQTT client + Mongoose + JWT
- **IoT**: ESP32 firmware (Arduino) with PubSubClient for MQTT, PIR/manual sensors
- **Analytics**: Python FastAPI service with ML models for forecasting/anomaly detection
- **Monitoring**: Prometheus scraping custom metrics + Grafana dashboards
- **Database**: MongoDB with composite indexes for efficient classroom-level queries

## Critical Developer Workflows

### Development Setup
```powershell
# Frontend (port 5173)
npm run dev

# Backend (port 3001) - in separate terminal
cd backend; npm run dev

# Full stack orchestration
docker-compose up -d

# Check health
curl http://localhost:3001/health
```

### Testing Approach
```powershell
# Frontend: Jest with jsdom
npm test
npm run test:watch
npm run test:coverage

# Backend: Jest with supertest for API routes
cd backend
npm test -- deviceController.test.js
npm run test:ci

# Coverage thresholds enforced: 80% lines, 70% branches
```

### Database Maintenance
```powershell
# Initialize indexes (required after fresh MongoDB)
cd backend; node scripts/createIndexes.js

# Reset test data without losing structure
cd backend; node scripts/clear-test-data.js

# Create admin user (idempotent)
cd backend; node create_admin.js
```

## Project-Specific Patterns

### Device-Centric Data Model
**Why**: Atomic switch operations, simplified permission checks, better performance

```javascript
// Device structure with embedded switches (from Device.js)
Device {
  _id: ObjectId,
  name: "Classroom 101",
  mac: "AA:BB:CC:DD:EE:FF",  // Always normalize to colon format
  classroom: ObjectId,       // Reference to Classroom
  status: "online" | "offline",
  switches: [{
    _id: ObjectId,
    name: "Main Light",
    gpio: 16,              // Validate with gpioUtils.validateGpioPin()
    type: "light" | "fan" | "projector" | "ac" | "outlet" | "relay",
    state: true,
    manualOverride: false,
    lastStateChange: Date,
    voiceAliases: ["room light", "main lamp"]
  }],
  assignedUsers: [ObjectId],  // Permission check: req.user._id in this array
  createdAt: Date,
  updatedAt: Date
}
```

**Critical validation** in Device model's `pre-save` hook:
- GPIO pins: Use `gpioUtils.validateGpioPin(gpio, allowProblematic, deviceType)` 
- MAC normalization: Convert to `AA:BB:CC:DD:EE:FF` format
- Backward compatibility: Allow problematic GPIO pins on existing devices during bulk operations

### Power Consumption Tracking - Dual System Architecture
**Legacy concern**: System underwent migration from simple tracker to immutable ledger

```javascript
// activeSwitch tracking (from PowerConsumptionTracker.js)
this.activeSwitches = new Map() // switchId → { startTime, power, type, deviceId }

// On switch ON: tracker.startTracking(switchId, power, type)
// On switch OFF: cost = tracker.endTracking(switchId) → saves to DeviceConsumptionLedger
// Rate config: loads from PowerSettings.getSingleton() with fallback defaults
// Aggregation: service runs jobs for Daily → Monthly → Classroom summaries
```

**Key files**: `backend/services/powerConsumptionTracker.js`, `backend/models/DeviceConsumptionLedger.js`, `backend/models/PowerSettings.js`

### Real-Time Communication Patterns
**MQTT** (device ↔ backend synchronization):
- Topics: `esp32/switches/<mac>/state`, `esp32/config/<mac>`, `esp32/telemetry`
- MAC address as topic segment for multi-device support
- 500ms debounce on state changes to prevent duplicate database writes

**WebSocket** (backend → frontend live updates):
- Server emits via `socketService.broadcast()`: `device_state_changed`, `switch_intent`, `bulk_switch_intent`
- Sequence numbers: Use `nextDeviceSeq()` in Counter model for deterministic ordering
- Connection state tracked in `SocketProvider` context with automatic reconnection

### Authentication & Authorization
```javascript
// Middleware chain (from routes/devices.js)
router.post('/:deviceId/switches/:switchId/toggle',
  auth,                                    // Verify JWT, populate req.user
  checkDevicePermission('canTurnOn'),      // Check switch-level permissions + assignedUsers
  toggleSwitch                             // Controller action
);

// Role hierarchy (from auth.js)
const roleHierarchy = {
  'super-admin': 10,
  'dean': 9,
  'admin': 8,
  'faculty': 7,
  'student': 5,
  'guest': 3
};
// Super-admin bypasses all checks; others checked against hierarchy
```

**Token storage**: localStorage with automatic refresh from `useAuth()` hook. Voice sessions use separate tokens with 30-min expiry.

## Integration Points

### ESP32 Device Communication
- **Firmware**: `esp32/warp_esp32_stable.ino` with AsyncMqttClient + ArduinoJson
- **GPIO Config**: Per-switch pin mapping sent via MQTT on device registration
- **Sensors**: PIR (GPIO 34, input-only) + Microwave (GPIO 35) with AND/OR logic
- **Manual Switches**: GPIO pulled high/low, configurable as momentary or maintained
- **State sync**: Device publishes state on startup and after each switch change; backend reconciles

### External Services Integration
- **Telegram Bot** (`/api/telegram/webhook`): Webhook receives messages, triggers device commands via socket
- **AI/ML Service** (port 8002): REST calls to `http://ai-ml-service:8002/forecast` for predictions
- **Grafana** (port 3000): Embedded via iframe, authenticated via token stored in Settings
- **Prometheus** (`/metrics`): Scrapes device_online_count, power_consumption_total custom metrics

### Database Patterns
- **Connection**: Single MongoDB instance with `.env` fallback URI support
- **Indexes**: See `scripts/createIndexes.js` for composite indexes on (classroom, status), (deviceMac, timestamp)
- **Virtuals**: Device model includes `id` virtual mapping `_id` to `id` for API responses
- **Middleware hooks**: Pre-save validates GPIO, normalizes MAC; post-find excludes sensitive fields

## Code Quality & Development Standards

### Frontend Code Organization
```
src/
  components/        # Radix UI + Tailwind (Button, Dialog, Card, etc.)
  pages/            # Route pages with Suspense boundary
  context/          # Global state: AuthContext, SocketContext, NotificationContext
  hooks/            # Custom hooks: useDevices, useAuth, useGlobalLoading
  services/         # API calls (api.ts), Socket.IO (socket.ts)
  types/            # TypeScript interfaces for Domain models
  utils/            # Helpers (formatting, validation)
```

**Patterns**:
- `useQuery` for server state, `useContext` for global state
- Error boundaries at route level; try-catch in async operations
- Type definitions in `types/` matching backend models

### Backend Code Organization
```
backend/
  controllers/      # Route handlers with try-catch + error logging
  routes/           # Express route definitions with middleware chains
  models/           # Mongoose schemas with validation + virtuals
  services/         # Business logic: powerTracker, mqttService, telegramService
  middleware/       # auth.js, authorize(), checkDevicePermission(), rateLimiter
  utils/            # gpioUtils, validators, helpers
```

**Patterns**:
- Middleware chains: `auth → authorize → permission check → handler`
- Error handling: Express error middleware catches all exceptions
- Logging: Winston logger with request/response tracking
- Validation: express-validator for input sanitization

### Testing Philosophy
```javascript
// Backend test structure (tests/setup.js establishes test DB)
describe('Device Controller', () => {
  beforeEach(() => {
    // Create test device with known state
  });
  
  test('toggle switch changes state and triggers MQTT', async () => {
    // Arrange: mock MQTT client
    // Act: POST /devices/:id/switches/:sid/toggle
    // Assert: response status + database state + MQTT publish call
  });
});
```

## Common Development Tasks

### Adding New Device Type
1. Add to `switchTypes` array in `Device.js`
2. Update `PowerSettings` singleton with power consumption values
3. Add GPIO recommendations to `esp32/config.h` and `gpioUtils.js`
4. Create corresponding UI component in `src/components/`
5. Add tests covering validation + permission checks

### Implementing New API Endpoint
1. **Controller** (`controllers/deviceController.js`): implement async handler
2. **Route** (`routes/devices.js`): add with full middleware chain including auth + authorize
3. **Frontend** (`src/services/api.ts`): add API call function
4. **React hook** (`src/hooks/useDevices.ts`): wrap with useQuery for caching
5. **Error scenarios**: test offline device, permission denied, validation errors

### Adding Real-Time Feature
1. **Backend**: Emit from appropriate service via `socketService.broadcast(event, data)`
2. **Frontend**: Listen in `SocketProvider` context, update state
3. **Sequence ordering**: Include `deviceSeq` from `Counter` model for deterministic UI updates
4. **TypeScript**: Add event type to `DeviceNotification` interface in `socket.ts`

### ESP32 Firmware Changes
1. Test GPIO configuration with `gpioUtils.validateGpioPin()` before deployment
2. Update MQTT topic handlers in `mqtt.onMessage()` handler
3. Maintain backward compatibility: add feature flags for gradual rollout
4. Add comprehensive logging via Serial for remote debugging

## Debugging Strategies

### Device Connectivity Issues
```powershell
# Check MQTT broker
netstat -ano | findstr :1883

# Monitor MQTT messages (if mosquitto installed)
mosquitto_sub -h localhost -t "esp32/#" -v

# Verify device in database
cd backend; node -e "const m = require('./models/Device'); m.find({status:'offline'}, 'name mac status').exec().then(d => console.log(d))"
```

### Real-Time Sync Issues
```javascript
// Browser console - check socket connection state
// Check Network tab for WebSocket frames
// Verify event listeners in SocketProvider render

// Backend - check MQTT message parsing
console.log('[MQTT]', 'Received:', topic, message.toString())
```

### Power Consumption Discrepancies
```powershell
# Check active switch tracking
cd backend; node -e "const t = require('./services/powerConsumptionTracker'); console.log(t.activeSwitches)"

# Verify ledger entries
db.deviceconsumptionledgers.aggregate([{$match:{timestamp:{$gte:new Date(Date.now()-86400000)}}}, {$group:{_id:'$deviceId', total:{$sum:'$energyUsed'}}}])
```

## Deployment Considerations

### Environment Configuration
```bash
# .env required variables
MONGODB_URI=mongodb://mongo:27017/autovolt
JWT_SECRET=<32+_char_random_string>
MQTT_BROKER=mqtt  # Docker service name
TELEGRAM_BOT_TOKEN=<token>
AI_ML_SERVICE_URL=http://ai-ml-service:8002
GRAFANA_URL=http://grafana:3000
```

### Docker Orchestration
- Service dependency order: MongoDB → Backend → Frontend
- MQTT broker: Aedes (in-process) or Mosquitto (separate container)
- AI/ML: Separate FastAPI container with shared volume for models
- Monitoring: Prometheus scrapes backend `/metrics`, Grafana queries Prometheus

### Production Hardening Checklist
- [ ] Rate limiting enabled on auth routes (`express-rate-limit` 100 req/15min)
- [ ] CORS configured for production domain only
- [ ] Helmet security headers enabled
- [ ] JWT_SECRET rotated and 32+ characters
- [ ] MongoDB with authentication and network restrictions
- [ ] MQTT broker requires username/password
- [ ] ESP32 devices validate server certificates
- [ ] Prometheus/Grafana behind authentication

## Key Files Reference

### Must-Read for New Features
- `backend/server.js` - Express setup, MQTT connection, Socket.IO initialization
- `backend/models/Device.js` - Device/switch schema, validation logic
- `src/context/SocketContext.tsx` - Real-time event management
- `backend/services/powerConsumptionTracker.js` - Energy calculation logic
- `esp32/warp_esp32_stable.ino` - Firmware for GPIO + MQTT coordination

### Common Edit Locations
- **New role permission**: `backend/models/RolePermissions.js`
- **New device type**: Device model + PowerSettings + gpioUtils
- **New API route**: Create controller + route file following existing patterns
- **Real-time events**: Emit from backend service + listen in SocketProvider

## Important Context

This is a **production IoT system** controlling physical classroom equipment. Every change impacts device safety:
- GPIO validation prevents ESP32 crashes from misconfigured pins
- Permission checks enforce classroom access control
- Power tracking must account for offline devices and state drift
- MQTT debouncing prevents race conditions in physical device state

Before merging changes, verify: device connectivity, permission enforcement, power calculation accuracy, and backward compatibility with existing ESP32 firmware versions.

### Backend Patterns
- **Route Organization**: Feature-based routing with middleware chains
- **Error Handling**: Centralized error middleware with status code mapping
- **Logging**: Winston logger with request/response tracking
- **Validation**: Express-validator with custom sanitizers

### Testing Patterns
- **Unit Tests**: Jest with jsdom for frontend, supertest for API routes
- **Integration Tests**: Full request/response cycles with test database
- **Mock Data**: Use test utilities for consistent test data generation
- **Coverage**: Target 80%+ coverage with meaningful assertions

## Common Development Tasks

### Adding New Device Types
1. Update `switchTypes` array in Device model
2. Add power ratings to `powerSettings.json`
3. Update frontend UI components for new type icons
4. Add validation in device creation forms

### Implementing New API Endpoints
1. Create controller function in appropriate controller file
2. Add route in corresponding routes file with auth middleware
3. Update frontend service functions and React Query hooks
4. Add comprehensive tests with error scenarios

### Adding Real-Time Features
1. Define WebSocket event types in frontend SocketContext
2. Implement server-side emission in appropriate service
3. Add sequence numbering for deterministic ordering
4. Update UI components with real-time state management

### ESP32 Firmware Changes
1. Test GPIO configurations with `gpioUtils` validation
2. Update MQTT topic handlers for new message types
3. Maintain backward compatibility with existing device configurations
4. Add comprehensive logging for debugging device issues

## Debugging Commands

### Device Connectivity
```bash
# Check MQTT broker
netstat -ano | findstr :1883

# Test device API
curl -H "Authorization: Bearer <token>" http://localhost:3001/api/devices
```

### Database Issues
```bash
# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# View recent activity logs
cd backend && node check_recent_tickets.js
```

### Real-Time Issues
```bash
# Monitor WebSocket connections
# Check browser Network tab for WebSocket frames

# Test MQTT messages
cd backend && node debug_telegram_registration.js
```

## Deployment Considerations

### Environment Variables
- **Database**: `MONGODB_URI` with fallback support
- **Security**: `JWT_SECRET` (32+ chars), bcrypt rounds = 12
- **MQTT**: Broker host/port with authentication
- **External APIs**: Telegram bot token, SMTP credentials

### Docker Services
- **Dependencies**: Start MongoDB before backend
- **Networking**: Use `iot-network` for service communication
- **Volumes**: Persistent data for Grafana, Prometheus, MongoDB

### Production Hardening
- **Rate Limiting**: API routes protected with express-rate-limit
- **CORS**: Configured for development vs production origins
- **Helmet**: Security headers for all responses
- **Monitoring**: Health checks and metrics endpoints

## Key Files to Reference

### Architecture Understanding
- `README.md`: System overview and quick start
- `backend/server.js`: Main application setup and MQTT integration
- `backend/models/Device.js`: Core data model with validation logic
- `esp32/warp_esp32_stable.ino`: ESP32 firmware implementation

### Development Workflow
- `package.json`: Frontend scripts and dependencies
- `backend/package.json`: Backend scripts and dependencies
- `docker-compose.yml`: Full-stack development environment
- `jest.config.js`: Testing configuration

### Business Logic
- `backend/services/scheduleService.js`: Automated device scheduling
- `backend/services/powerConsumptionTracker.js`: Energy tracking logic
- `ai_ml_service/main.py`: AI/ML analytics implementation
- `backend/services/telegramService.js`: Bot integration logic

Remember: This is a production IoT system controlling physical devices. Always test GPIO configurations, handle device offline states gracefully, and maintain backward compatibility with existing ESP32 firmware versions.