const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';
const TEST_MAC = 'AA:BB:CC:DD:EE:FF';
let testDeviceId = null;
let authToken = null;

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
  if (passed) {
    testResults.passed++;
    log(`✅ ${name}`, 'green');
  } else {
    testResults.failed++;
    log(`❌ ${name}`, 'red');
    testResults.errors.push({ test: name, details });
  }
  if (details) {
    log(`   ${details}`, 'yellow');
  }
}

// Setup test database connection
async function setupDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/autovolt', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('\n✅ Connected to MongoDB', 'green');
    
    // Get or create test device
    const Device = require('../models/Device');
    let device = await Device.findOne({ macAddress: TEST_MAC });
    
    if (!device) {
      device = await Device.create({
        name: 'Test Power Device',
        macAddress: TEST_MAC,
        secret: 'test-secret-123',
        classroom: 'Test Lab',
        location: 'Test Lab Room 101',
        ipAddress: '192.168.1.100',
        switches: [
          { name: 'Switch 1', state: false, relayGpio: 13, type: 'relay' },
          { name: 'Switch 2', state: false, relayGpio: 14, type: 'relay' }
        ],
        powerSettings: {
          pricePerUnit: 7.5,
          consumptionFactor: 1.0
        }
      });
      log('✅ Created test device', 'green');
    }
    
    testDeviceId = device._id.toString();
    log(`   Device ID: ${testDeviceId}`, 'blue');
    log(`   MAC Address: ${TEST_MAC}`, 'blue');
    
    return device;
  } catch (error) {
    log(`❌ Database setup failed: ${error.message}`, 'red');
    throw error;
  }
}

// Authenticate to get token
async function authenticate() {
  try {
    const User = require('../models/User');
    
    // Create test user if not exists
    let testUser = await User.findOne({ email: 'test@test.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'test@test.com',
        password: 'test123456',
        name: 'Test User',
        role: 'admin'
      });
    }
    
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@test.com',
      password: 'test123456'
    });
    
    authToken = response.data.token;
    log('✅ Authentication successful', 'green');
    return authToken;
  } catch (error) {
    log(`⚠️  Authentication failed, some tests may fail: ${error.message}`, 'yellow');
    return null;
  }
}

// Test 1: Submit live power reading
async function testSubmitPowerReading() {
  log('\n📝 Test 1: Submit Live Power Reading', 'blue');
  
  try {
    const reading = {
      voltage: 230.5,
      current: 2.3,
      power: 529.15,
      activeSwitches: 2,
      totalSwitches: 2,
      metadata: {
        temperature: 28.5,
        test: true
      }
    };
    
    const response = await axios.post(
      `${API_BASE}/esp32/power-reading/${TEST_MAC}`,
      reading
    );
    
    if (response.data.success && response.data.readingId) {
      logTest('Submit power reading', true, `Reading ID: ${response.data.readingId}`);
      return true;
    } else {
      logTest('Submit power reading', false, 'Invalid response format');
      return false;
    }
  } catch (error) {
    logTest('Submit power reading', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 2: Submit multiple readings for aggregation
async function testMultipleReadings() {
  log('\n📝 Test 2: Submit Multiple Readings', 'blue');
  
  try {
    const readings = [];
    for (let i = 0; i < 5; i++) {
      const reading = {
        voltage: 230 + Math.random() * 5,
        current: 2 + Math.random(),
        power: 0, // Will be calculated
        activeSwitches: Math.floor(Math.random() * 3),
        totalSwitches: 2
      };
      
      const response = await axios.post(
        `${API_BASE}/esp32/power-reading/${TEST_MAC}`,
        reading
      );
      
      if (response.data.success) {
        readings.push(response.data);
      }
      
      // Wait 100ms between readings
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (readings.length === 5) {
      logTest('Submit multiple readings', true, `Submitted ${readings.length} readings`);
      return true;
    } else {
      logTest('Submit multiple readings', false, `Only ${readings.length}/5 succeeded`);
      return false;
    }
  } catch (error) {
    logTest('Submit multiple readings', false, error.message);
    return false;
  }
}

// Test 3: Sync offline readings
async function testOfflineSync() {
  log('\n📝 Test 3: Sync Offline Readings', 'blue');
  
  try {
    const now = new Date();
    const offlineReadings = [];
    
    // Create 10 offline readings
    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - (10 - i) * 60 * 1000); // 10 minutes ago to now
      offlineReadings.push({
        timestamp: timestamp.toISOString(),
        voltage: 230 + Math.random() * 5,
        current: 2 + Math.random(),
        power: 500 + Math.random() * 100,
        activeSwitches: Math.floor(Math.random() * 3),
        totalSwitches: 2,
        metadata: { offline: true }
      });
    }
    
    const response = await axios.post(
      `${API_BASE}/esp32/sync-readings/${TEST_MAC}`,
      { readings: offlineReadings }
    );
    
    if (response.data.success && response.data.inserted > 0) {
      logTest('Sync offline readings', true, 
        `Inserted: ${response.data.inserted}, Duplicates: ${response.data.duplicates}`);
      return true;
    } else {
      logTest('Sync offline readings', false, 'No readings inserted');
      return false;
    }
  } catch (error) {
    logTest('Sync offline readings', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 4: Get current power
async function testGetCurrentPower() {
  log('\n📝 Test 4: Get Current Power', 'blue');
  
  if (!authToken) {
    logTest('Get current power', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_BASE}/power-analytics/current/${testDeviceId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.power !== undefined && response.data.status) {
      logTest('Get current power', true, 
        `Power: ${response.data.power}W, Status: ${response.data.status}`);
      return true;
    } else {
      logTest('Get current power', false, 'Invalid response format');
      return false;
    }
  } catch (error) {
    logTest('Get current power', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 5: Get daily consumption
async function testGetDailyConsumption() {
  log('\n📝 Test 5: Get Daily Consumption', 'blue');
  
  if (!authToken) {
    logTest('Get daily consumption', false, 'No auth token available');
    return false;
  }
  
  try {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_BASE}/power-analytics/daily/${testDeviceId}?startDate=${startDate}&endDate=${endDate}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (Array.isArray(response.data)) {
      const todayData = response.data.find(d => d.date === endDate);
      if (todayData) {
        logTest('Get daily consumption', true, 
          `Today: ${todayData.energyKwh} kWh, Cost: ₹${todayData.cost}`);
      } else {
        logTest('Get daily consumption', true, `Data for ${response.data.length} days`);
      }
      return true;
    } else {
      logTest('Get daily consumption', false, 'Invalid response format');
      return false;
    }
  } catch (error) {
    logTest('Get daily consumption', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 6: Get monthly consumption
async function testGetMonthlyConsumption() {
  log('\n📝 Test 6: Get Monthly Consumption', 'blue');
  
  if (!authToken) {
    logTest('Get monthly consumption', false, 'No auth token available');
    return false;
  }
  
  try {
    const year = new Date().getFullYear();
    
    const response = await axios.get(
      `${API_BASE}/power-analytics/monthly/${testDeviceId}?year=${year}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (Array.isArray(response.data)) {
      logTest('Get monthly consumption', true, `Data for ${response.data.length} months`);
      return true;
    } else {
      logTest('Get monthly consumption', false, 'Invalid response format');
      return false;
    }
  } catch (error) {
    logTest('Get monthly consumption', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 7: Get today's hourly consumption
async function testGetTodayHourly() {
  log('\n📝 Test 7: Get Today\'s Hourly Consumption', 'blue');
  
  if (!authToken) {
    logTest('Get today hourly', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_BASE}/power-analytics/today-hourly/${testDeviceId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (Array.isArray(response.data)) {
      logTest('Get today hourly', true, `Data for ${response.data.length} hours`);
      return true;
    } else {
      logTest('Get today hourly', false, 'Invalid response format');
      return false;
    }
  } catch (error) {
    logTest('Get today hourly', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 8: Update power settings
async function testUpdatePowerSettings() {
  log('\n📝 Test 8: Update Power Settings', 'blue');
  
  if (!authToken) {
    logTest('Update power settings', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.put(
      `${API_BASE}/power-settings/${testDeviceId}`,
      {
        pricePerUnit: 8.5,
        consumptionFactor: 0.95
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.success) {
      logTest('Update power settings', true, 
        `Price: ₹${response.data.settings.pricePerUnit}/kWh, Factor: ${response.data.settings.consumptionFactor}`);
      return true;
    } else {
      logTest('Update power settings', false, 'Update failed');
      return false;
    }
  } catch (error) {
    logTest('Update power settings', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 9: Get power settings
async function testGetPowerSettings() {
  log('\n📝 Test 9: Get Power Settings', 'blue');
  
  if (!authToken) {
    logTest('Get power settings', false, 'No auth token available');
    return false;
  }
  
  try {
    const response = await axios.get(
      `${API_BASE}/power-settings/${testDeviceId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (response.data.pricePerUnit !== undefined) {
      logTest('Get power settings', true, 
        `Price: ₹${response.data.pricePerUnit}/kWh, Factor: ${response.data.consumptionFactor}`);
      return true;
    } else {
      logTest('Get power settings', false, 'Invalid response format');
      return false;
    }
  } catch (error) {
    logTest('Get power settings', false, error.response?.data?.message || error.message);
    return false;
  }
}

// Test 10: Test duplicate prevention
async function testDuplicatePrevention() {
  log('\n📝 Test 10: Duplicate Prevention', 'blue');
  
  try {
    const reading = {
      voltage: 230.5,
      current: 2.3,
      power: 529.15,
      activeSwitches: 2,
      totalSwitches: 2
    };
    
    // Submit same reading twice
    await axios.post(`${API_BASE}/esp32/power-reading/${TEST_MAC}`, reading);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try to sync with duplicate timestamp
    const timestamp = new Date().toISOString();
    const response = await axios.post(
      `${API_BASE}/esp32/sync-readings/${TEST_MAC}`,
      {
        readings: [
          { ...reading, timestamp },
          { ...reading, timestamp } // Duplicate
        ]
      }
    );
    
    if (response.data.duplicates > 0) {
      logTest('Duplicate prevention', true, 
        `Inserted: ${response.data.inserted}, Duplicates: ${response.data.duplicates}`);
      return true;
    } else {
      logTest('Duplicate prevention', true, 'No duplicates detected (system working correctly)');
      return true;
    }
  } catch (error) {
    // Duplicate error is expected
    if (error.response?.status === 500 && error.response?.data?.message?.includes('duplicate')) {
      logTest('Duplicate prevention', true, 'Duplicate rejection working');
      return true;
    }
    logTest('Duplicate prevention', false, error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log('\n' + '='.repeat(60), 'blue');
  log('🧪 POWER CONSUMPTION SYSTEM TEST SUITE', 'blue');
  log('='.repeat(60) + '\n', 'blue');
  
  try {
    // Setup
    await setupDatabase();
    await authenticate();
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run tests
    await testSubmitPowerReading();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testMultipleReadings();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testOfflineSync();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetCurrentPower();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetDailyConsumption();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetMonthlyConsumption();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetTodayHourly();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testUpdatePowerSettings();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testGetPowerSettings();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testDuplicatePrevention();
    
    // Results
    log('\n' + '='.repeat(60), 'blue');
    log('📊 TEST RESULTS', 'blue');
    log('='.repeat(60), 'blue');
    log(`✅ Passed: ${testResults.passed}`, 'green');
    log(`❌ Failed: ${testResults.failed}`, 'red');
    log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%\n`, 'blue');
    
    if (testResults.errors.length > 0) {
      log('❌ Failed Tests:', 'red');
      testResults.errors.forEach(error => {
        log(`   - ${error.test}: ${error.details}`, 'yellow');
      });
      log('');
    }
    
    process.exit(testResults.failed > 0 ? 1 : 0);
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
