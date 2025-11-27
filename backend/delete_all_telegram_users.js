require('dotenv').config();
const mongoose = require('mongoose');

// Register models first
require('./models/User');
require('./models/TelegramUser');

const TelegramUser = require('./models/TelegramUser');
const User = require('./models/User');

async function deleteAllTelegramUsers() {
    try {
        console.log('🗑️  Deleting all Telegram users from database...\n');

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt');
        console.log('✅ Connected to MongoDB\n');

        // Get count before deletion
        const countBefore = await TelegramUser.countDocuments();
        console.log(`📊 Found ${countBefore} Telegram users in database\n`);

        if (countBefore === 0) {
            console.log('ℹ️  No Telegram users to delete');
            return;
        }

        // Show users that will be deleted
        const users = await TelegramUser.find({}).populate('user', 'name role');
        console.log('👥 Users to be deleted:');
        users.forEach((telegramUser, index) => {
            console.log(`   ${index + 1}. ${telegramUser.user?.name || 'Unknown'} (${telegramUser.user?.role || 'Unknown'}) - Chat ID: ${telegramUser.chatId}`);
        });
        console.log('');

        // Ask for confirmation (in a real scenario, you'd want user confirmation)
        console.log('⚠️  WARNING: This will permanently delete all Telegram user records!');
        console.log('   This action cannot be undone.');
        console.log('   Users will need to re-register with the Telegram bot.\n');

        // Delete all Telegram users
        const result = await TelegramUser.deleteMany({});
        console.log(`✅ Successfully deleted ${result.deletedCount} Telegram users\n`);

        // Verify deletion
        const countAfter = await TelegramUser.countDocuments();
        console.log(`📊 Telegram users remaining: ${countAfter}`);

        if (countAfter === 0) {
            console.log('🎉 All Telegram users successfully deleted!');
        } else {
            console.log('⚠️  Some users may not have been deleted');
        }

    } catch (error) {
        console.error('❌ Error deleting Telegram users:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from database');
    }
}

// Run the deletion
if (require.main === module) {
    deleteAllTelegramUsers().then(() => {
        console.log('\n🏁 Deletion process completed');
        process.exit(0);
    }).catch((error) => {
        console.error('\n💥 Deletion failed:', error);
        process.exit(1);
    });
}

module.exports = { deleteAllTelegramUsers };