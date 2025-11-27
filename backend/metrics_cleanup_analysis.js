/**
 * METRICS CLEANUP ANALYSIS
 * 
 * This document identifies which metrics are REQUIRED vs UNNECESSARY
 * based on actual usage in the application.
 */

// ============================================
// ✅ REQUIRED METRICS (Actually Used)
// ============================================

const REQUIRED_METRICS = [
  // Basic device counts - Used in Dashboard
  'device_online_count',
  'device_offline_count',
  
  // Power metrics - Used in Energy Monitoring & Analytics
  'device_power_usage_watts',
  'device_power_usage_by_type_watts',
  'device_power_usage_by_classroom_type_watts',
  
  // Energy consumption - Used in Energy Dashboard
  'device_energy_consumption_kwh',
  
  // Device health - Used in Dashboard
  'device_health_score',
  
  // ESP32 metrics - Used for device monitoring
  'esp32_device_count',
  'esp32_power_usage_watts',
  'esp32_online_status',
  'esp32_switch_state',
  'esp32_heap_memory_bytes',
  'esp32_energy_consumption_daily_kwh',
  'esp32_energy_consumption_monthly_kwh',
  'esp32_energy_consumption_total_daily_kwh',
  'esp32_energy_consumption_total_monthly_kwh'
];

// ============================================
// ❌ UNNECESSARY METRICS (Not Used Anywhere)
// ============================================

const UNNECESSARY_METRICS = [
  // Device ON/OFF counts - Redundant (already have online/offline)
  'device_on_count',         // ❌ Not used in frontend
  'device_off_count',        // ❌ Not used in frontend
  
  // Power factor - Not implemented, mock data only
  'device_power_factor',     // ❌ No real power factor measurement
  
  // Occupancy - No actual PIR sensors, only mock data
  'classroom_occupancy_percentage',  // ❌ Mock data only
  'occupancy_sensor_status',         // ❌ No real sensors
  
  // Uptime/Downtime - Not displayed anywhere
  'device_uptime_hours',      // ❌ Not used
  'device_downtime_hours',    // ❌ Not used
  
  // Anomaly detection - Not fully implemented
  'device_anomaly_count',     // ❌ Basic implementation only
  'device_anomaly_severity',  // ❌ Not displayed
  
  // Time limit - Not used
  'switch_time_limit_exceeded_total', // ❌ Not implemented
  'switch_time_on_minutes',           // ❌ Not used
  
  // ESP32 telemetry - Too detailed, not needed
  'esp32_telemetry_received_total',  // ❌ Not displayed
  'esp32_command_sent_total',        // ❌ Not displayed
  'esp32_connection_uptime_seconds', // ❌ Not used
  'esp32_temperature_celsius',       // ❌ No temperature sensor on most ESP32
];

// ============================================
// 📊 SUMMARY
// ============================================

console.log('\n' + '='.repeat(70));
console.log('METRICS CLEANUP ANALYSIS');
console.log('='.repeat(70));
console.log(`\n✅ Required Metrics: ${REQUIRED_METRICS.length}`);
console.log(`❌ Unnecessary Metrics: ${UNNECESSARY_METRICS.length}`);
console.log(`💾 Space Savings: ~${UNNECESSARY_METRICS.length * 100} lines of code`);
console.log('\n' + '='.repeat(70));

console.log('\n❌ METRICS TO REMOVE:\n');
UNNECESSARY_METRICS.forEach((metric, i) => {
  console.log(`   ${i + 1}. ${metric}`);
});

console.log('\n✅ METRICS TO KEEP:\n');
REQUIRED_METRICS.forEach((metric, i) => {
  console.log(`   ${i + 1}. ${metric}`);
});

console.log('\n' + '='.repeat(70));
console.log('RECOMMENDATION: Remove unnecessary metrics to simplify codebase');
console.log('='.repeat(70) + '\n');

module.exports = {
  REQUIRED_METRICS,
  UNNECESSARY_METRICS
};
