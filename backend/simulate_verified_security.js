const mongoose = require('mongoose');
const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

// Test script to simulate security alert delivery after verification
async function simulateVerifiedSecurityUsers() {
  try {
    console.log('🎭 Simulating Security Alert Delivery After Verification\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Get all active Telegram users
    const allUsers = await TelegramUser.find({ isActive: true }).populate('user');

    console.log('📊 Current Status:');
    console.log(`   Total active Telegram users: ${allUsers.length}`);

    const verifiedUsers = allUsers.filter(u => u.isVerified);
    const unverifiedUsers = allUsers.filter(u => !u.isVerified);

    console.log(`   Verified users: ${verifiedUsers.length}`);
    console.log(`   Unverified users: ${unverifiedUsers.length}\n`);

    // Simulate verification for security users
    console.log('🔄 Simulating verification for security users...');

    const securityUsers = allUsers.filter(u => u.user?.role === 'security');
    console.log(`   Found ${securityUsers.length} security users to verify`);

    for (const securityUser of securityUsers) {
      // Simulate verification
      securityUser.isVerified = true;
      securityUser.verifiedAt = new Date();
      console.log(`   ✅ Verified: ${securityUser.user.name}`);
    }
    console.log('');

    // Now test alert delivery with simulated verified users
    console.log('🧪 Testing alert delivery with verified security users:');

    // Simulate getActiveSubscribers for security_alerts
    const securityAlertSubscribers = allUsers.filter(user =>
      user.isActive && user.isVerified && user.shouldReceiveAlert('security_alerts')
    );

    console.log(`   Security alerts would go to: ${securityAlertSubscribers.length} users`);
    securityAlertSubscribers.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.user?.name} (${user.user?.role})`);
    });

    // Simulate getActiveSubscribers for energy_alerts
    const energyAlertSubscribers = allUsers.filter(user =>
      user.isActive && user.isVerified && user.shouldReceiveAlert('energy_alerts')
    );

    console.log(`   Energy alerts would go to: ${energyAlertSubscribers.length} users`);
    energyAlertSubscribers.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.user?.name} (${user.user?.role})`);
    });

    // Simulate evening lights alerts
    const eveningLightsSubscribers = allUsers.filter(user =>
      user.isActive && user.isVerified && user.shouldReceiveAlert('switchesOnAfter5PM')
    );

    console.log(`   Evening lights alerts would go to: ${eveningLightsSubscribers.length} users`);
    eveningLightsSubscribers.forEach((user, index) => {
      console.log(`      ${index + 1}. ${user.user?.name} (${user.user?.role})`);
    });

    console.log('');
    console.log('✅ Simulation completed!');
    console.log('\n📋 Expected behavior after security users complete verification:');
    console.log('   • Security alerts: 3 users (1 admin + 2 security)');
    console.log('   • Energy alerts: 3 users (1 admin + 2 security)');
    console.log('   • Evening lights alerts: 3 users (1 admin + 2 security)');
    console.log('\n⚠️  Security users need to complete Telegram verification to receive alerts!');

  } catch (error) {
    console.error('❌ Error simulating verified security users:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the simulation
if (require.main === module) {
  simulateVerifiedSecurityUsers().then(() => {
    console.log('\n🎉 Simulation completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Simulation failed:', error);
    process.exit(1);
  });
}

module.exports = { simulateVerifiedSecurityUsers };