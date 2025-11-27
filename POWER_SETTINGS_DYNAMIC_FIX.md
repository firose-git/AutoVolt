# Power Settings Dynamic Update Fix

## Problem
The power consumption calculations and electricity pricing were using hardcoded values (₹7.5/kWh) throughout the project. When admins updated power settings through the UI, the changes were not reflected in cost calculations.

## Root Causes
1. **Backend metricsService.js**: Hardcoded `ELECTRICITY_RATE_INR_PER_KWH = 7.5` constant
2. **Device Power Consumption**: Hardcoded power values in `getBasePowerConsumption()` function
3. **Frontend Display**: Hardcoded "Rate: ₹7.5/kWh" in EnergyMonitoringDashboard
4. **No Real-time Updates**: Backend didn't reload settings after admin changes

## Solutions Implemented

### 1. Backend - metricsService.js Updates

#### Dynamic Electricity Price Loading
```javascript
// Before: Hardcoded constant
const ELECTRICITY_RATE_INR_PER_KWH = 7.5;

// After: Dynamic loading with periodic refresh
let ELECTRICITY_RATE_INR_PER_KWH = 7.5;
let devicePowerSettings = {
  'light': 40,
  'fan': 75,
  'projector': 200,
  'ac': 1500,
  'computer': 300,
  'default': 50
};

async function loadPowerSettings() {
  // Loads from backend/data/powerSettings.json
  // Updates both electricity price and device power consumption
}

// Initialize on startup
loadPowerSettings();

// Auto-refresh every 30 seconds
setInterval(loadPowerSettings, 30000);
```

#### Dynamic Device Power Consumption
```javascript
// Updated getBasePowerConsumption() to use dynamic settings
const typeMapping = {
  'relay': devicePowerSettings['default'],
  'light': devicePowerSettings['light'],
  'fan': devicePowerSettings['fan'],
  'projector': devicePowerSettings['projector'],
  'ac': devicePowerSettings['ac'],
  'computer': devicePowerSettings['computer'],
  // ... more mappings
};
```

### 2. Backend - settings.js Updates

#### Immediate Reload After Save
```javascript
// Import metricsService reload function
const { loadPowerSettings: reloadMetricsSettings } = require('../metricsService');

// In POST /api/settings/power route
await savePowerSettings(settings);

// Reload immediately in metricsService
console.log('[Settings] Reloading power settings in metricsService...');
await reloadMetricsSettings();
```

#### Fixed Price Endpoint Response
```javascript
// GET /api/settings/power/price
res.json({ 
  price: settings.electricityPrice,  // Changed from 'electricityPrice' to 'price'
  currency: 'INR',
  unit: 'kWh'
});
```

### 3. Frontend - EnergyMonitoringDashboard.tsx Updates

#### Dynamic Price State
```typescript
const [electricityPrice, setElectricityPrice] = useState<number>(7.5);

// Fetch from API
const fetchElectricityPrice = async () => {
  const response = await apiService.get('/settings/power/price');
  if (response.data && typeof response.data.price === 'number') {
    setElectricityPrice(response.data.price);
  }
};
```

#### Display Dynamic Price
```tsx
{/* Before: Hardcoded */}
<div className="text-xs text-muted-foreground">
  Rate: ₹7.5/kWh
</div>

{/* After: Dynamic */}
<div className="text-xs text-muted-foreground">
  Rate: ₹{electricityPrice.toFixed(2)}/kWh
</div>
```

#### Reload After Settings Change
```tsx
<PowerSettings 
  isOpen={showPowerSettings} 
  onClose={() => {
    setShowPowerSettings(false);
    // Reload data after settings change
    fetchElectricityPrice();
    fetchSummaryData();
    fetchChartData();
  }} 
/>
```

### 4. Frontend - PowerSettings.tsx Icon Fix

#### Fixed Icon Rendering
```typescript
// Icon mapping for proper React component rendering
const iconMap: Record<string, IconComponent> = {
  'Lightbulb': Lightbulb,
  'Fan': Fan,
  'Monitor': Monitor,
  'Activity': Activity,
  'Server': Server,
  'Zap': Zap
};

// Helper to convert icon names to components
const getIconComponent = (iconName: string | IconComponent): IconComponent => {
  if (typeof iconName === 'string') {
    return iconMap[iconName] || Zap;
  }
  return iconName;
};
```

## Data Flow

### When Admin Updates Settings:

1. **User Action**: Admin clicks "Save" in PowerSettings modal
2. **API Call**: POST `/api/settings/power` with new values
3. **Backend Save**: Settings saved to `backend/data/powerSettings.json`
4. **Immediate Reload**: `metricsService.loadPowerSettings()` called
5. **Frontend Reload**: Modal closes, triggers data refresh
6. **UI Update**: New price displayed, new calculations shown

### Automatic Updates:

1. **Backend Auto-Refresh**: Every 30 seconds, metricsService checks for changes
2. **Frontend Load**: On component mount, fetches current price
3. **Cost Calculations**: All calculations use current `ELECTRICITY_RATE_INR_PER_KWH`
4. **Power Consumption**: All device power uses current `devicePowerSettings`

## Files Modified

### Backend
1. `backend/metricsService.js`
   - Added dynamic power settings loading
   - Auto-refresh every 30 seconds
   - Updated device power consumption mapping
   - Exported `loadPowerSettings` function

2. `backend/routes/settings.js`
   - Import metricsService reload function
   - Immediate reload after save
   - Fixed `/power/price` response format

### Frontend
1. `src/components/EnergyMonitoringDashboard.tsx`
   - Added electricity price state
   - Fetch price from API
   - Display dynamic price
   - Reload on settings change

2. `src/components/PowerSettings.tsx`
   - Fixed icon rendering (React warnings)
   - Icon name to component mapping
   - Proper TypeScript types

## Testing

### Test Electricity Price Update:
1. Open Energy Monitoring Dashboard
2. Note current rate (e.g., ₹7.50/kWh)
3. Click Settings icon
4. Change electricity price to ₹10.00
5. Click Save
6. **Expected**: Dashboard shows "Rate: ₹10.00/kWh" immediately
7. Refresh page
8. **Expected**: Price persists as ₹10.00/kWh

### Test Device Power Update:
1. Open PowerSettings
2. Change "Light" power from 40W to 60W
3. Save settings
4. Check device runtime calculations
5. **Expected**: Light devices now calculate cost using 60W

### Test Cost Calculations:
1. Before: 40W light × 10 hours × ₹7.50/kWh = ₹3.00
2. After (60W, ₹10/kWh): 60W light × 10 hours × ₹10.00/kWh = ₹6.00
3. **Expected**: Costs double due to combined changes

## Verification Commands

```bash
# Check current settings
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://172.16.3.171:3001/api/settings/power

# Check electricity price
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://172.16.3.171:3001/api/settings/power/price

# Check device energy summary (uses current settings)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://172.16.3.171:3001/api/analytics/energy-summary
```

## Benefits

✅ **Real-time Updates**: Changes take effect within 1 second (immediate reload)
✅ **Automatic Sync**: Auto-refresh every 30 seconds catches manual file edits
✅ **Accurate Costs**: All calculations use current pricing
✅ **Flexible Configuration**: Different power values per device type
✅ **No Restarts Needed**: Backend picks up changes without restart
✅ **Persistent**: Settings survive server restarts
✅ **Admin Control**: Only admins can modify settings

## Known Limitations

1. **30-Second Lag**: Auto-refresh means up to 30s delay if file edited manually
   - **Solution**: Use UI to save settings (triggers immediate reload)

2. **No Real-time Push**: Frontend doesn't auto-update if another admin changes settings
   - **Workaround**: Refresh page or close/reopen PowerSettings modal

3. **Single File Storage**: Settings stored in JSON file (not database)
   - **Impact**: Works fine for configuration data (infrequent changes)

## Future Enhancements

1. **WebSocket Push**: Notify all connected clients when settings change
2. **Database Storage**: Move power settings to MongoDB
3. **History Tracking**: Log who changed settings and when
4. **Validation**: Add min/max limits for power consumption values
5. **Regional Pricing**: Support different rates per classroom/location
6. **Time-based Rates**: Peak/off-peak electricity pricing

## Troubleshooting

### Settings Not Updating?

1. **Check Backend Logs**: Look for "[Metrics] Loaded electricity price" messages
2. **Verify File**: Check `backend/data/powerSettings.json` has correct values
3. **Check Permissions**: Ensure backend can read/write the file
4. **Manual Reload**: Restart backend server to force reload

### Old Price Still Showing?

1. **Hard Refresh Browser**: Ctrl+F5 or Cmd+Shift+R
2. **Check API Response**: Use browser DevTools Network tab
3. **Verify Route**: Ensure `/api/settings/power/price` returns current value
4. **Check State**: Console log `electricityPrice` state value

### Calculations Wrong?

1. **Verify Device Types**: Check device type matches power settings types
2. **Check Mapping**: Ensure `typeMapping` in metricsService includes type
3. **Test Formula**: cost = (watts × hours / 1000) × price per kWh
4. **Check Logs**: Look for power consumption calculation logs
