// Temporary script to list all users in the database for debugging
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';

async function listUsers() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const users = await User.find({}, { name: 1, email: 1, role: 1, isActive: 1, isApproved: 1, registrationDate: 1 });
  console.log('Users in database:');
  users.forEach(u => {
    console.log({
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      isApproved: u.isApproved,
      registrationDate: u.registrationDate
    });
  });
  await mongoose.disconnect();
}

listUsers().catch(err => { console.error(err); process.exit(1); });
