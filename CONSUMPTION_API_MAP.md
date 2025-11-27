# 📊 Power Consumption System - Complete API & File Mapping

## 🔌 Backend APIs

### **Analytics Routes** (`/api/analytics/*`)
Located in: `backend/routes/analytics.js`

| Endpoint | Method | Description | Used By (Frontend) |
|----------|--------|-------------|-------------------|
| `/api/analytics/energy-summary` | GET | Daily & monthly consumption totals | ✅ Index.tsx, EnergyMonitoringDashboard.tsx, AnalyticsPanel.tsx |
| `/api/analytics/energy/:timeframe` | GET | Energy data for 1h/24h/7d/30d/90d | ✅ EnergyMonitoringDashboard.tsx, AnalyticsPanel.tsx |
| `/api/analytics/energy-calendar/:year/:month` | GET | Daily breakdown for calendar view | ✅ EnergyMonitoringDashboard.tsx |
| `/api/analytics/dashboard` | GET | Complete dashboard analytics | - |
| `/api/analytics/metrics` | GET | Prometheus metrics export | - |
| `/api/analytics/forecast/:type/:timeframe` | GET | AI forecast data | ✅ AnalyticsPanel.tsx |
| `/api/analytics/anomalies/:timeframe` | GET | Anomaly detection results | ✅ AnalyticsPanel.tsx |

### **Energy Consumption Routes** (`/api/energy-consumption/*`)
Located in: `backend/routes/energyConsumption.js`

| Endpoint | Method | Description | Used By (Frontend) |
|----------|--------|-------------|-------------------|
| `/api/energy-consumption/classroom/:classroom` | GET | Consumption by classroom | ⚠️ Not currently used |
| `/api/energy-consumption/device/:deviceId` | GET | Consumption by device | ⚠️ Not currently used |
| `/api/energy-consumption/active-switches` | GET | Currently active switches | ⚠️ Not currently used |
| `/api/energy-consumption/summary` | GET | Overall consumption summary | ⚠️ Not currently used |
| `/api/energy-consumption/comparison` | GET | Compare classrooms/devices | ⚠️ Not currently used |

---

## 📁 Backend Core Files

### **Power Consumption Tracking**
| File | Purpose | Key Functions |
|------|---------|---------------|
| `backend/services/powerConsumptionTracker.js` | Real-time power tracking service | `trackSwitchOn()`, `trackSwitchOff()`, `getPowerConsumption()` |
| `backend/services/consumptionAggregationService.js` | Aggregates hourly → daily → monthly | Data aggregation logic |
| `backend/metricsService.js` | Core calculation engine | `calculatePreciseEnergyConsumption()`, `getEnergySummary()`, `getEnergyData()`, `getEnergyCalendar()` |

### **Controllers**
| File | Purpose | Power-Related Functions |
|------|---------|------------------------|
| `backend/controllers/deviceController.js` | Device control logic | Tracks power when switches change state (line 733-779) |
| `backend/controllers/esp32Controller.js` | ESP32 communication | Logs power consumption on state changes (line 398-480) |

### **Models**
| File | Purpose |
|------|---------|
| `backend/models/EnergyConsumption.js` | MongoDB schema for energy records |
| `backend/models/ActivityLog.js` | Logs all switch ON/OFF events with `powerConsumption` field |
| `backend/models/Device.js` | Device schema with switch power settings |

### **Configuration**
| File | Purpose |
|------|---------|
| `backend/data/powerSettings.json` | Device type power ratings (40W light, 75W fan, 1500W AC, etc.) |
| `backend/.env` | Electricity rate and MongoDB connection |

---

## 🎨 Frontend Components

### **Main Dashboard Components**
| Component | Location | APIs Used | Purpose |
|-----------|----------|-----------|---------|
| **Index.tsx** | `src/pages/Index.tsx` | `/analytics/energy-summary` | Main dashboard with 3-card power display (Today, This Month, Bill) |
| **EnergyMonitoringDashboard.tsx** | `src/components/EnergyMonitoringDashboard.tsx` | `/analytics/energy-summary`<br>`/analytics/energy/:timeframe`<br>`/analytics/energy-calendar/:year/:month` | Energy tab with summary cards, charts, and calendar |
| **AnalyticsPanel.tsx** | `src/components/AnalyticsPanel.tsx` | `/analytics/energy-summary`<br>`/analytics/energy/:timeframe`<br>`/analytics/forecast/:type/:timeframe`<br>`/analytics/anomalies/:timeframe` | Analytics dashboard with energy trends and AI forecasts |

### **Supporting Components**
| Component | Location | Purpose |
|-----------|----------|---------|
| **PowerSettings.tsx** | `src/components/PowerSettings.tsx` | Modal to configure device power ratings |
| **AIMLPanel.tsx** | `src/components/AIMLPanel.tsx` | AI/ML predictions (uses `/analytics/energy-history`) |

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SWITCHES DEVICE                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  deviceController.js / esp32Controller.js                        │
│  → trackSwitchOn() or trackSwitchOff()                          │
│  → Stores powerConsumption in ActivityLog                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  powerConsumptionTracker.js                                      │
│  → Tracks active switches in Map (switchId → {power, time})    │
│  → Calculates energy: (Power × Time) / 1000                    │
│  → Stores in EnergyConsumption collection                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  metricsService.js                                               │
│  → calculatePreciseEnergyConsumption(deviceId, start, end)     │
│  → Reads ActivityLog, aggregates by time period                │
│  → getEnergySummary() → daily & monthly totals                 │
│  → getEnergyData(timeframe) → chart data (hourly/daily)        │
│  → getEnergyCalendar(year, month) → calendar view              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  API Routes (analytics.js)                                       │
│  → GET /analytics/energy-summary                                │
│  → GET /analytics/energy/:timeframe                             │
│  → GET /analytics/energy-calendar/:year/:month                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Frontend Components                                             │
│  → Index.tsx: Power Consumption cards                           │
│  → EnergyMonitoringDashboard.tsx: Energy tab charts            │
│  → AnalyticsPanel.tsx: Analytics dashboard                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Power Consumption Calculation

### **Formula**
```javascript
Energy (kWh) = (Power in Watts × Time in Hours) / 1000
Cost (₹) = Energy (kWh) × Electricity Rate (₹7.00/kWh)
```

### **Power Settings** (from `powerSettings.json`)
- **Light**: 40W
- **Fan**: 75W
- **Outlet**: 100W
- **Projector**: 200W
- **AC**: 1500W
- **Relay (default)**: 50W

### **Key Functions**

#### `calculatePreciseEnergyConsumption(deviceId, startTime, endTime)`
**Location**: `backend/metricsService.js:1276`
- Reads ActivityLog for switch ON/OFF events
- Tracks device online/offline status
- Only counts consumption when device is ONLINE
- Returns total kWh for the period

#### `getEnergySummary()`
**Location**: `backend/metricsService.js:2582`
- Calculates TODAY's consumption (00:00 to now)
- Calculates THIS MONTH's consumption (1st to now)
- Returns: `{ daily: {consumption, cost, runtime}, monthly: {consumption, cost, runtime} }`

#### `getEnergyData(timeframe)`
**Location**: `backend/metricsService.js:2516`
- Returns hourly data for 24h view
- Returns daily aggregated data for 7d/30d views
- Format: `[{timestamp, totalConsumption, totalCostINR, ...}]`

#### `getEnergyCalendar(year, month)`
**Location**: `backend/metricsService.js:2740`
- Calculates consumption for each day of the month
- Returns calendar data with daily totals and categories (low/medium/high)
- Format: `{ month, year, days: [{date, consumption, cost, runtime, category}], totalCost, totalConsumption }`

---

## 🐛 Known Issues & Fixes Applied

### ✅ **Fixed Issues**
1. **Power values mismatch** - Updated `getBasePowerConsumption()` to match `powerSettings.json`
2. **Chart showing individual values** - Added "Total for Period" summary box at top of charts
3. **Data aggregation** - Implemented hourly → daily aggregation for 7d/30d views
4. **Card clarity** - Separated Today's Usage vs This Month with distinct colors

### ⚠️ **Potential Issues**
1. **Unused APIs** - `/api/energy-consumption/*` endpoints not used by frontend
2. **Duplicate logic** - Both `analytics.js` and `energyConsumption.js` serve similar data
3. **Calendar timezone** - Relies on system clock (may show wrong date if system year incorrect)

---

## 📝 Summary

**Primary APIs Used**:
1. `/api/analytics/energy-summary` → Powers all consumption cards
2. `/api/analytics/energy/:timeframe` → Powers all consumption charts
3. `/api/analytics/energy-calendar/:year/:month` → Powers calendar view

**Core Calculation File**: `backend/metricsService.js`
**Power Tracking Service**: `backend/services/powerConsumptionTracker.js`
**Data Storage**: MongoDB collections `ActivityLog` and `EnergyConsumption`

**Frontend Files Displaying Consumption**:
- `src/pages/Index.tsx` (main dashboard cards)
- `src/components/EnergyMonitoringDashboard.tsx` (energy tab)
- `src/components/AnalyticsPanel.tsx` (analytics charts)
