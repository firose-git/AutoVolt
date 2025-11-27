# Telegram Bot Improvements

## Overview
This document summarizes the improvements made to the Telegram bot to enhance user experience and implement real-time after-hours lights monitoring.

## Improvements Made

### 1. Enhanced Numeric Input Parsing

**Location:** `services/telegramService.js` (lines 1130-1163)

**What Changed:**
- Improved the existing numeric menu reply system to handle more menu types
- Added support for `devices` menu numeric replies
- Added support for `alert` menu numeric replies
- Enhanced error messages and user guidance

**Benefits:**
- Users can now reply with just a number (e.g., "1", "2", "3") after seeing any menu
- Works for all menu types: status, help, subscribe, unsubscribe, devices, and alert
- More intuitive and faster interaction
- 5-minute memory window for recent menus

**Example Usage:**
```
User: /subscribe
Bot: [Shows menu with options 1-6]
User: 4
Bot: ✅ Successfully subscribed to Energy Alerts!
```

### 2. After-Hours Lights Monitoring Service

**Location:** `services/afterHoursLightsMonitor.js`

**What It Does:**
- Monitors activity logs in real-time (checks every 2 minutes)
- Detects when lights are turned on after 5 PM (17:00)
- Also detects lights turned on before 6 AM (for overnight security)
- Sends immediate alerts to security personnel via Telegram
- Groups alerts by classroom/location for better organization
- Implements cooldown period (1 hour) to avoid alert spam

**Key Features:**
- **Real-time monitoring**: Checks activity logs every 2 minutes
- **Configurable threshold**: Default 5 PM, can be changed via API
- **Alert cooldown**: 1 hour between alerts for the same device/switch
- **Smart filtering**: Only alerts for light switches (matches "light", "lamp", "bulb")
- **Detailed alerts**: Includes device name, location, time, and who triggered it
- **Location grouping**: Organizes multiple alerts by classroom

**Alert Structure:**
```
🚨 After-Hours Lights Alert

⚠️ 2 light(s) turned ON after 17:00

Location: Computer_Lab

Details:
1. Main Light (ESP32_Lab_01)
   📍 Computer Lab - Section A
   ⏰ Time: 6:45:30 PM
   👤 By: John Doe (manual_switch)

2. Secondary Light (ESP32_Lab_02)
   📍 Computer Lab - Section B
   ⏰ Time: 6:47:15 PM
   👤 By: Jane Smith (user)

Timestamp: 12/20/2024, 6:50:00 PM

Please verify if these lights should remain on or take appropriate action.
```

### 3. Alert Routing Configuration

**Location:** `routes/telegram.js` (line 66)

**What Changed:**
- Confirmed alert type mapping: `SwitchesOnAfter5PM` → `switchesOnAfter5PM`
- This connects to the TelegramUser model subscription system
- Security personnel with `energy_alerts` subscription receive these alerts

**Alert Subscription:**
- Alert Type: `switchesOnAfter5PM`
- Who Receives: Security personnel (role: 'security') with energy_alerts subscription
- Subscription Logic: Defined in `models/TelegramUser.js` (lines 213-215)

### 4. New API Endpoints

**Location:** `routes/telegram.js` (lines 136-190)

#### Test After-Hours Monitor
```
POST /api/telegram/test-after-hours-monitor
Authorization: Bearer <token>
Required Roles: admin, super-admin, security

Response:
{
  "success": true,
  "message": "After-hours lights check triggered",
  "result": {
    "success": true,
    "message": "After-hours lights check completed",
    "lastChecked": "2024-12-20T18:50:00.000Z"
  }
}
```

#### Get After-Hours Status
```
GET /api/telegram/after-hours-status
Authorization: Bearer <token>
Required Roles: admin, super-admin, security

Response:
{
  "success": true,
  "status": {
    "isRunning": true,
    "afterHoursThreshold": "17:00",
    "checkInterval": "120 seconds",
    "lastCheckedTimestamp": "2024-12-20T18:50:00.000Z",
    "alertCooldown": "60 minutes",
    "recentAlertsCount": 5
  }
}
```

#### Update Configuration
```
PATCH /api/telegram/after-hours-config
Authorization: Bearer <token>
Required Roles: admin, super-admin

Body:
{
  "afterHoursThreshold": 18,  // Change to 6 PM
  "alertCooldown": 30         // 30 minutes cooldown
}

Response:
{
  "success": true,
  "message": "Configuration updated",
  "status": { ... }
}
```

### 5. Server Integration

**Location:** `server.js` (lines 1665-1667)

**What Changed:**
- Added after-hours lights monitor to server initialization
- Service starts automatically when server starts
- Runs alongside existing monitoring services

## Testing Guide

### Test 1: Numeric Input Enhancement

1. **Register with the bot** (if not already registered):
   ```
   /register your-email@university.edu
   ```

2. **Test subscribe menu**:
   ```
   User: /subscribe
   Bot: [Shows menu]
   User: 4
   Expected: Bot subscribes you to Energy Alerts
   ```

3. **Test status menu**:
   ```
   User: /status
   Bot: [Shows menu]
   User: 1
   Expected: Bot shows your personal status
   ```

4. **Test devices menu**:
   ```
   User: /devices
   Bot: [Shows menu]
   User: 1
   Expected: Bot shows offline devices
   ```

### Test 2: After-Hours Lights Monitoring

#### Prerequisites:
- Security personnel registered with the bot
- Subscribed to `energy_alerts` (option 4)
- Light switches configured in your devices

#### Manual Test:
```
POST http://localhost:3001/api/telegram/test-after-hours-monitor
Headers:
  Authorization: Bearer <your-token>

Expected: Bot checks activity logs and sends alert if lights were turned on after 5 PM
```

#### Real-World Test:
1. **Wait until after 5 PM (17:00)**
2. **Turn on any light switch manually** via:
   - Frontend UI
   - Manual switch on ESP32 device
   - API call to turn on light

3. **Wait 2-3 minutes** (service checks every 2 minutes)

4. **Check Telegram**:
   - Security personnel should receive an alert
   - Alert should show which light was turned on
   - Alert should show who turned it on and when

### Test 3: Configuration Changes

#### Change after-hours threshold to 6 PM:
```
PATCH http://localhost:3001/api/telegram/after-hours-config
Headers:
  Authorization: Bearer <your-token>
Body:
{
  "afterHoursThreshold": 18
}

Expected: Service now monitors lights turned on after 6 PM instead of 5 PM
```

#### Change alert cooldown to 30 minutes:
```
PATCH http://localhost:3001/api/telegram/after-hours-config
Headers:
  Authorization: Bearer <your-token>
Body:
{
  "alertCooldown": 30
}

Expected: Same device/switch can trigger alerts every 30 minutes instead of 60
```

### Test 4: Verify Service Status

```
GET http://localhost:3001/api/telegram/after-hours-status
Headers:
  Authorization: Bearer <your-token>

Expected:
{
  "success": true,
  "status": {
    "isRunning": true,
    "afterHoursThreshold": "17:00",
    "checkInterval": "120 seconds",
    "lastCheckedTimestamp": "2024-12-20T18:50:00.000Z",
    "alertCooldown": "60 minutes",
    "recentAlertsCount": 0
  }
}
```

## Troubleshooting

### Issue: Not Receiving After-Hours Alerts

**Possible Causes:**
1. User not subscribed to `energy_alerts`
   - **Fix**: `/subscribe 4` in Telegram

2. User role is not 'security'
   - **Fix**: Contact admin to update role in database

3. Service not running
   - **Check**: Call `/api/telegram/after-hours-status`
   - **Fix**: Restart server

4. No lights turned on after hours
   - **Check**: Activity logs in database
   - **Fix**: Turn on a light manually after 5 PM

5. Alert cooldown active
   - **Check**: `recentAlertsCount` in status
   - **Fix**: Wait for cooldown period to expire

### Issue: Numeric Replies Not Working

**Possible Causes:**
1. More than 5 minutes passed since menu was shown
   - **Fix**: Show menu again

2. User not verified
   - **Fix**: Complete registration and verification

3. Menu state not recorded properly
   - **Fix**: Restart bot, try command again

### Debug Logs

Look for these log prefixes in server console:
- `[AFTER-HOURS]` - After-hours lights monitor logs
- `[EVENING-LIGHTS]` - Evening lights monitor logs (10 AM check)
- `[SMART-NOTIFICATIONS]` - Device offline alerts
- `Telegram Debug` - Telegram bot debug info (if enabled)

Enable Telegram debug mode:
```bash
export TELEGRAM_DEBUG=true
# or in .env file:
TELEGRAM_DEBUG=true
```

## Configuration Options

### After-Hours Monitor

**Default Settings:**
- Check Interval: 2 minutes (120 seconds)
- After-Hours Threshold: 17:00 (5 PM)
- Alert Cooldown: 60 minutes
- Light Switch Pattern: /light|lamp|bulb/i

**Configurable via API:**
- `afterHoursThreshold`: Integer (0-23) for hour of day
- `alertCooldown`: Integer (minutes) for cooldown period

**Hard-Coded Settings** (require code changes):
- `checkInterval`: Modify in `afterHoursLightsMonitor.js` line 21
- Light switch pattern: Modify regex in line 87

## Architecture

### Service Flow:

```
Activity Log → After-Hours Monitor → Telegram Service → Security Personnel
     ↓                  ↓                    ↓                    ↓
  Database         Filters &            Formats           Receives
   Writes          Groups by            Message            Alert
                   Location
```

### Alert Subscription Flow:

```
User Role → Pre-set Subscriptions → Alert Type Filtering → Alert Delivery
    ↓              ↓                         ↓                     ↓
 'security'    energy_alerts      switchesOnAfter5PM          Telegram
```

## Future Enhancements

1. **Machine Learning**: Predict unusual lighting patterns
2. **Schedule Integration**: Auto-suppress alerts during scheduled events
3. **Custom Time Ranges**: Different thresholds for different days
4. **Energy Analytics**: Track energy consumption from after-hours lighting
5. **Push Notifications**: Support for web push in addition to Telegram
6. **Multi-language**: Support for multiple languages in alerts

## Related Files

- `services/telegramService.js` - Main Telegram bot service
- `services/afterHoursLightsMonitor.js` - After-hours monitoring service
- `services/eveningLightsMonitor.js` - 10 AM daily check service
- `services/smartNotificationService.js` - Offline device monitoring
- `models/TelegramUser.js` - User subscription model
- `models/ActivityLog.js` - Activity logging model
- `routes/telegram.js` - API endpoints
- `server.js` - Server initialization

## Contact

For issues or questions, contact the development team or refer to the main project README.
