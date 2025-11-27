/**
 * VERIFY METRICS CLEANUP
 * Confirms all unnecessary metrics have been removed
 */

const fs = require('fs');
const path = require('path');

const metricsFilePath = path.join(__dirname, 'metricsService.js');
const content = fs.readFileSync(metricsFilePath, 'utf8');

const REMOVED_METRICS = [
  'device_on_count',
  'device_off_count',
  'device_power_factor',
  'classroom_occupancy_percentage',
  'occupancy_sensor_status',
  'device_uptime_hours',
  'device_downtime_hours',
  'device_anomaly_count',
  'device_anomaly_severity',
  'switch_time_limit_exceeded_total',
  'switch_time_on_minutes',
  'esp32_telemetry_received_total',
  'esp32_command_sent_total',
  'esp32_connection_uptime_seconds',
  'esp32_temperature_celsius'
];

const REQUIRED_METRICS = [
  'device_online_count',
  'device_offline_count',
  'device_power_usage_watts',
  'device_energy_consumption_kwh',
  'device_health_score',
  'esp32_device_count',
  'esp32_power_usage_watts',
  'esp32_online_status',
  'esp32_switch_state',
  'esp32_heap_memory_bytes'
];

console.log('\n' + '='.repeat(70));
console.log('✅ METRICS CLEANUP VERIFICATION');
console.log('='.repeat(70) + '\n');

let allRemoved = true;
let allPresent = true;

console.log('❌ CHECKING REMOVED METRICS:\n');
REMOVED_METRICS.forEach((metric, i) => {
  const found = content.includes(`'${metric}'`) || content.includes(`"${metric}"`);
  if (found) {
    console.log(`   ❌ ${i + 1}. ${metric} - STILL PRESENT (FAILED)`);
    allRemoved = false;
  } else {
    console.log(`   ✅ ${i + 1}. ${metric} - Successfully removed`);
  }
});

console.log('\n✅ CHECKING REQUIRED METRICS:\n');
REQUIRED_METRICS.forEach((metric, i) => {
  const found = content.includes(`'${metric}'`) || content.includes(`"${metric}"`);
  if (found) {
    console.log(`   ✅ ${i + 1}. ${metric} - Present`);
  } else {
    console.log(`   ❌ ${i + 1}. ${metric} - MISSING (FAILED)`);
    allPresent = false;
  }
});

console.log('\n' + '='.repeat(70));
if (allRemoved && allPresent) {
  console.log('🎉 SUCCESS: All unnecessary metrics removed, all required metrics intact!');
} else {
  if (!allRemoved) console.log('⚠️  WARNING: Some metrics were not fully removed');
  if (!allPresent) console.log('⚠️  WARNING: Some required metrics are missing');
}
console.log('='.repeat(70) + '\n');

// Count lines saved
const lines = content.split('\n');
console.log(`📊 File Statistics:`);
console.log(`   Total Lines: ${lines.length}`);
console.log(`   Metrics Removed: ${REMOVED_METRICS.length}`);
console.log(`   Metrics Kept: ${REQUIRED_METRICS.length}`);
console.log(`   Estimated Lines Saved: ~${REMOVED_METRICS.length * 12}\n`);
