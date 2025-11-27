# Power Settings Configuration Guide

## Overview
The Power Settings feature allows **Administrators** and **Super Admins** to dynamically configure power consumption values for different device types and set the electricity pricing. This enables accurate energy cost calculations throughout the AutoVolt system.

## Features

### 1. **Device Type Power Configuration**
Configure power consumption (in Watts) for each device type:
- **LED Lights**: Default 40W
- **HVAC Fans**: Default 75W
- **Projectors**: Default 200W
- **Air Conditioners**: Default 1500W
- **Computers/Servers**: Default 300W
- **Other Devices**: Default 50W (fallback)

### 2. **Electricity Pricing**
Set the electricity rate per kWh in Indian Rupees (₹):
- Default: ₹7.50 per kWh
- Can be adjusted based on local electricity rates
- Updates all cost calculations in real-time

### 3. **Real-time Cost Calculation**
- Automatically calculates hourly costs per device type
- Example: 40W light × ₹7.50/kWh = ₹0.30/hour
- Used across all energy monitoring dashboards

## How to Access

### Navigation Path
1. Go to **Analytics & Monitoring** → **Energy** section
2. Click the **Settings** icon (⚙️) next to the Calendar icon
3. The Power Settings modal will open

### User Requirements
- **Role**: Admin or Super Admin only
- **Permission**: Management access required
- Other roles cannot view or modify these settings

## Using Power Settings

### Step 1: Open Power Settings
Click the Settings icon in the Energy Monitoring Dashboard header (next to the calendar icon).

### Step 2: Configure Electricity Price
1. Locate the **Electricity Price** card (blue background)
2. Enter the price per kWh in rupees (e.g., 7.50)
3. The display shows the formatted rate: ₹7.50/kWh

### Step 3: Set Device Power Consumption
For each device type:
1. Find the device card (e.g., "LED Lights")
2. Enter the power consumption in Watts
3. View the calculated cost per hour below the input
4. Example: 40W → Cost per hour: ₹0.30

### Step 4: Save Changes
1. Click **Save Settings** button at the bottom
2. Wait for confirmation message
3. Settings are applied immediately across the system

### Step 5: Verify Changes
- Refresh the Energy Monitoring Dashboard
- Check updated cost calculations
- Review AI/ML forecasts with new values

## API Endpoints

### Get Power Settings
```http
GET /api/settings/power
Authorization: Bearer {token}
```

**Response:**
```json
{
  "deviceTypes": [
    {
      "type": "light",
      "name": "LED Lights",
      "icon": "Lightbulb",
      "powerConsumption": 40,
      "unit": "W"
    }
    // ... more device types
  ],
  "electricityPrice": 7.5
}
```

### Update Power Settings (Admin Only)
```http
POST /api/settings/power
Authorization: Bearer {token}
Content-Type: application/json

{
  "deviceTypes": [...],
  "electricityPrice": 7.5
}
```

### Get Device Type Power
```http
GET /api/settings/power/device/:type
Authorization: Bearer {token}
```

### Get Electricity Price
```http
GET /api/settings/power/price
Authorization: Bearer {token}
```

**Response:**
```json
{
  "electricityPrice": 7.5,
  "currency": "INR",
  "unit": "kWh"
}
```

## Data Storage
- Settings stored in: `backend/data/powerSettings.json`
- Automatically created on first save
- Persists across server restarts
- Falls back to defaults if file missing

## Impact on System

### Affected Components
1. **Energy Monitoring Dashboard**
   - Real-time cost calculations
   - Daily/monthly cost summaries
   - Cost trend charts

2. **AI/ML Panel**
   - Forecast cost predictions
   - Power consumption forecasts
   - Cost analysis charts

3. **Analytics Dashboard**
   - Device power metrics
   - Cost breakdown reports
   - Energy efficiency scores

4. **Backend Calculations**
   - Activity log cost tracking
   - Historical data processing
   - Prometheus metrics

### Calculation Formula
```javascript
// Hourly cost calculation
const costPerHour = (powerConsumption / 1000) * electricityPrice;

// Example: 40W LED Light at ₹7.50/kWh
// costPerHour = (40 / 1000) * 7.50 = ₹0.30/hour

// Daily cost (8 hours usage)
const dailyCost = costPerHour * 8;  // ₹2.40/day

// Monthly cost (30 days, 8 hours/day)
const monthlyCost = dailyCost * 30;  // ₹72.00/month
```

## Best Practices

### 1. Accurate Power Values
- Use manufacturer specifications for device wattage
- Measure actual power consumption if possible
- Consider peak vs average consumption
- Account for power factor corrections

### 2. Regional Pricing
- Check your local electricity board rates
- Include all taxes and surcharges
- Update seasonally if rates change
- Consider time-of-use pricing

### 3. Regular Updates
- Review settings quarterly
- Update when electricity rates change
- Adjust for new device installations
- Verify against actual bills

### 4. Documentation
- Log all changes made
- Note reason for updates
- Keep record of old values
- Document any anomalies

## Troubleshooting

### Settings Not Saving
**Problem**: Changes don't persist after save
**Solution**: 
- Check admin permissions
- Verify backend server is running
- Check browser console for errors
- Ensure `/data` directory is writable

### Incorrect Calculations
**Problem**: Cost displays seem wrong
**Solution**:
- Verify power consumption values are in Watts
- Check electricity price is per kWh
- Review calculation formula above
- Clear browser cache and refresh

### Access Denied
**Problem**: Cannot open Power Settings
**Solution**:
- Verify user role (must be admin/super-admin)
- Check authentication token
- Log out and log back in
- Contact system administrator

### Default Values Loading
**Problem**: Custom settings reset to defaults
**Solution**:
- Check if `powerSettings.json` exists
- Verify file permissions
- Review server logs for errors
- Re-save settings

## Security Considerations

### Access Control
- Only admins can modify settings
- All users can view for transparency
- Changes are logged for audit
- Role verification on every request

### Data Validation
- Power consumption must be non-negative
- Electricity price must be positive
- Device types validated on save
- JSON schema enforcement

### Audit Trail
- All changes logged to system
- User ID recorded for modifications
- Timestamp on every update
- Rollback capability maintained

## Future Enhancements

### Planned Features
1. **Time-of-Use Pricing**
   - Peak/off-peak rate schedules
   - Seasonal pricing variations
   - Dynamic rate adjustments

2. **Device-Specific Overrides**
   - Per-device power settings
   - Classroom-specific rates
   - Custom device categories

3. **Historical Comparison**
   - Track rate changes over time
   - Compare costs before/after updates
   - Impact analysis reports

4. **Import/Export**
   - Bulk device configuration
   - Settings backup/restore
   - Template sharing

## Support

For issues or questions:
- Check system logs: `backend/logs/`
- Contact: System Administrator
- Documentation: `/docs/POWER_SETTINGS.md`
- API Reference: Swagger UI at `/api/docs`

---

**Last Updated**: October 20, 2025  
**Version**: 1.0.0  
**Author**: AutoVolt Development Team
