const mongoose = require('mongoose');
require('./models/User');
require('./models/TelegramUser');
mongoose.connect('mongodb://localhost:27017/autovolt', { bufferCommands: false, serverSelectionTimeoutMS: 5000 }).then(async () => {
  const TelegramUser = require('./models/TelegramUser');
  const result = await TelegramUser.updateMany(
    { tokenExpires: { $lt: new Date() } },
    { $unset: { registrationToken: 1, tokenExpires: 1 } },
    { maxTimeMS: 5000, wtimeoutMS: 5000 }
  );
  console.log('Cleaned up', result.modifiedCount, 'expired tokens');
  await mongoose.disconnect();
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});