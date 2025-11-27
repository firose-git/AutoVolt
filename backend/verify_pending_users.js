const mongoose = require('mongoose');
const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

// Script to verify pending Telegram users using their verification codes
async function verifyPendingUsers() {
  try {
    console.log('✅ Verifying Pending Telegram Users\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get all pending users with their codes
    const pendingUsers = await TelegramUser.find({
      isActive: true,
      isVerified: false,
      registrationToken: { $exists: true, $ne: null }
    }).populate('user', 'name email role');

    if (pendingUsers.length === 0) {
      console.log('✅ No pending users with verification codes found');
      return;
    }

    console.log(`Found ${pendingUsers.length} users to verify:\n`);

    // Verify each user using their code
    for (const telegramUser of pendingUsers) {
      const code = telegramUser.registrationToken;
      const isValid = telegramUser.verifyToken(code);

      console.log(`🔍 Verifying: ${telegramUser.user?.name || 'Unknown'}`);
      console.log(`   Code: ${code}`);
      console.log(`   Valid: ${isValid ? '✅' : '❌'}`);
      console.log(`   Expires: ${telegramUser.tokenExpires?.toLocaleString() || 'No expiry'}`);

      if (isValid) {
        // Complete the verification
        telegramUser.clearToken();
        await telegramUser.save();

        console.log(`   ✅ VERIFICATION SUCCESSFUL!`);
        console.log(`   Status: Verified and active`);
        console.log(`   Subscriptions: ${telegramUser.roleSubscriptions.join(', ')}`);
      } else {
        console.log(`   ❌ VERIFICATION FAILED - Code invalid or expired`);
      }
      console.log('');
    }

    // Show final status
    console.log('📊 Final Status After Verification:\n');

    const allUsers = await TelegramUser.find({ isActive: true }).populate('user', 'name email role');
    const verified = allUsers.filter(u => u.isVerified);
    const stillPending = allUsers.filter(u => !u.isVerified);

    console.log(`✅ VERIFIED USERS (${verified.length}):`);
    verified.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.user?.name} (${user.user?.role}) - ${user.roleSubscriptions.join(', ')}`);
    });

    if (stillPending.length > 0) {
      console.log(`\n⏳ STILL PENDING (${stillPending.length}):`);
      stillPending.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.user?.name} (${user.user?.role})`);
      });
    }

    console.log('\n🎯 ALERT DISTRIBUTION NOW:');
    console.log('• Security Alerts: Go to admins + verified security personnel');
    console.log('• Energy Alerts: Go to admins + verified security/dean personnel');
    console.log('• Evening Lights: Go to admins + verified security personnel');

    // Test alert delivery
    console.log('\n🧪 Testing Alert Delivery:');

    const securitySubscribers = await TelegramUser.getActiveSubscribers('security_alerts');
    const energySubscribers = await TelegramUser.getActiveSubscribers('energy_alerts');
    const eveningLightsSubscribers = await TelegramUser.getActiveSubscribers('switchesOnAfter5PM');

    console.log(`   Security alerts: ${securitySubscribers.length} recipients`);
    console.log(`   Energy alerts: ${energySubscribers.length} recipients`);
    console.log(`   Evening lights: ${eveningLightsSubscribers.length} recipients`);

  } catch (error) {
    console.error('❌ Error verifying users:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the verification
if (require.main === module) {
  verifyPendingUsers().then(() => {
    console.log('\n🎉 Verification process completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Verification process failed:', error);
    process.exit(1);
  });
}

module.exports = { verifyPendingUsers };