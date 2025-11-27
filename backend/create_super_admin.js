// Usage: node create_super_admin.js
// This script creates a super-admin user in the autovolt database.

const mongoose = require('mongoose');
const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';

const adminData = {
  name: 'Super Admin',
  email: 'admin@autovolt.local',
  password: 'Admin@1234', // Change after first login
  role: 'super-admin',
  department: 'IT',
  phone: '9999999999',
  designation: 'System Administrator',
  isActive: true,
  isApproved: true
};

async function createSuperAdmin() {
  await mongoose.connect(MONGODB_URI);
  const existing = await User.findOne({ email: adminData.email });
  if (existing) {
    console.log('Super admin already exists:', adminData.email);
    process.exit(0);
  }
  const user = new User(adminData);
  await user.save();
  console.log('Super admin created!');
  console.log('Email:', adminData.email);
  console.log('Password:', adminData.password);
  process.exit(0);
}

createSuperAdmin().catch(e => {
  console.error(e);
  process.exit(1);
});
