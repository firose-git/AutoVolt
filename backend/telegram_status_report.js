const mongoose = require('mongoose');
const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

// Script to show current Telegram registration status and next steps
async function showTelegramStatus() {
  try {
    console.log('📊 Telegram Registration Status Report\n');

    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to database\n');

    // Get all Telegram users
    const allUsers = await TelegramUser.find({}).populate('user', 'name email role');

    console.log('📋 Current Telegram Registration Status:\n');

    // Group users by status
    const verified = allUsers.filter(u => u.isActive && u.isVerified);
    const pending = allUsers.filter(u => u.isActive && !u.isVerified);
    const inactive = allUsers.filter(u => !u.isActive);

    console.log(`✅ VERIFIED USERS (${verified.length}):`);
    if (verified.length > 0) {
      verified.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.user?.name || 'Unknown'} (${user.user?.role || 'Unknown'})`);
        console.log(`      Email: ${user.user?.email || 'Unknown'}`);
        console.log(`      Telegram ID: ${user.telegramId}`);
        console.log(`      Subscriptions: ${user.roleSubscriptions.join(', ')}`);
        console.log('');
      });
    } else {
      console.log('   No verified users\n');
    }

    console.log(`⏳ PENDING VERIFICATION (${pending.length}):`);
    if (pending.length > 0) {
      pending.forEach((user, index) => {
        const timeLeft = user.tokenExpires ?
          Math.max(0, Math.floor((user.tokenExpires - new Date()) / 1000 / 60)) : 0;

        console.log(`   ${index + 1}. ${user.user?.name || 'Unknown'} (${user.user?.role || 'Unknown'})`);
        console.log(`      Email: ${user.user?.email || 'Unknown'}`);
        console.log(`      Telegram ID: ${user.telegramId}`);
        console.log(`      Code: ${user.registrationToken || 'No code'}`);
        console.log(`      Expires: ${user.tokenExpires ? user.tokenExpires.toLocaleString() : 'No expiry'}`);
        console.log(`      Time left: ${timeLeft} minutes`);
        console.log('');
      });
    } else {
      console.log('   No pending users\n');
    }

    console.log(`❌ INACTIVE USERS (${inactive.length}):`);
    if (inactive.length > 0) {
      inactive.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.user?.name || 'Unknown'} (${user.user?.role || 'Unknown'})`);
        console.log(`      Email: ${user.user?.email || 'Unknown'}`);
        console.log('');
      });
    } else {
      console.log('   No inactive users\n');
    }

    // Summary and next steps
    console.log('🎯 SUMMARY & NEXT STEPS:\n');

    console.log(`Total Telegram Users: ${allUsers.length}`);
    console.log(`✅ Verified & Active: ${verified.length}`);
    console.log(`⏳ Pending Verification: ${pending.length}`);
    console.log(`❌ Inactive: ${inactive.length}\n`);

    if (pending.length > 0) {
      console.log('🚨 ACTION REQUIRED: Complete verification for pending users\n');

      console.log('For each pending user:');
      console.log('1. User opens Telegram and goes to the bot chat');
      console.log('2. User replies with their 6-character verification code');
      console.log('3. Bot confirms successful verification');
      console.log('4. User gains access to alerts based on their role\n');

      console.log('⚠️  Codes expire in 10 minutes!');
      console.log('   If expired, user must re-register with: /register <email>\n');
    }

    console.log('🔒 ALERT DISTRIBUTION:');
    console.log('• Security Alerts: Go to admins + verified security personnel');
    console.log('• Energy Alerts: Go to admins + verified security personnel');
    console.log('• Evening Lights: Go to admins + verified security personnel');
    console.log('• Admin Alerts: Go only to verified admin personnel\n');

    if (verified.length > 0) {
      console.log('✅ System is ready to send alerts to verified users!');
    } else {
      console.log('⚠️  No verified users - no alerts will be sent until verification is completed');
    }

  } catch (error) {
    console.error('❌ Error showing Telegram status:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the status check
if (require.main === module) {
  showTelegramStatus().then(() => {
    console.log('\n🎉 Status report completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Status report failed:', error);
    process.exit(1);
  });
}

module.exports = { showTelegramStatus };