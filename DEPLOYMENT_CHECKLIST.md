# Deployment Checklist

## ✅ Code Changes Applied
- [x] Backend login/getProfile fixes
- [x] ESP32 watchdog timeout increased
- [x] ESP32 WDT reset frequency increased
- [x] MQTT buffer size doubled
- [x] WiFi stability improvements
- [x] PIR initialization fix

## 📋 Next Steps

### 1. Restart Backend Server
```powershell
cd backend
npm run dev
```
**Expected**: Server starts without errors, logs show database connected

### 2. Flash ESP32 Firmware
```powershell
# From project root
pio run --target upload
```
**Expected**: Upload successful, device boots with new firmware

### 3. Monitor ESP32 Serial
```powershell
pio device monitor --baud 115200
```
**Look for**:
- `[WDT] Watchdog initialized with 15s timeout`
- `Signal strength: -XX dBm`
- `[SETUP] Motion sensor initialization: ENABLED/DISABLED`
- Heap memory staying above 10,000 bytes

### 4. Test User Login
1. Login to web UI
2. Open browser console (F12)
3. Run: `console.log(JSON.parse(localStorage.getItem('user_data')))`
4. **Verify** you see: `department`, `class`, `employeeId`, `permissions`

### 5. Test PIR Sensor (if enabled)
1. Enable PIR from device settings
2. Wave hand in front of PIR sensor
3. Check ESP32 serial output for motion detection messages
4. Verify switches turn ON/OFF as configured

## ⚠️ Known Issues to Monitor

- [ ] Watch ESP32 heap memory (should stay > 10,000 bytes)
- [ ] Test 24+ hour stability
- [ ] Verify all user roles can access their permitted pages
- [ ] Test PIR auto-off timing

## 🆘 If Something Goes Wrong

### Backend won't start:
```powershell
# Check MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check port 3001 is free
netstat -ano | findstr :3001
```

### ESP32 still crashes:
```powershell
# Monitor heap in serial output
# If heap < 5000 bytes, memory leak still present
# Check for infinite loops in handleMotionSensor()
```

### Users can't access pages:
- Clear browser cache: Ctrl+Shift+Delete
- Clear localStorage: `localStorage.clear()` in console
- Re-login

## 📊 Success Criteria

✅ Backend runs without errors  
✅ ESP32 runs 24+ hours without reboot  
✅ Users see department/class after login  
✅ PIR motion detection works  
✅ Heap memory stable > 10,000 bytes  

---

**Status**: Ready to Deploy  
**Priority**: HIGH  
**Estimated Time**: 30 minutes
