// Usage: node fix_role_permissions.js
// This script removes duplicate super-admin role permissions from the autovolt database.

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt';

async function fixRolePermissions() {
  await mongoose.connect(MONGODB_URI);
  const collection = mongoose.connection.collection('rolepermissions');
  // Find all super-admin role permission docs
  const docs = await collection.find({ role: 'super-admin' }).toArray();
  if (docs.length <= 1) {
    console.log('No duplicate super-admin role permissions found.');
    process.exit(0);
  }
  // Keep the first, delete the rest
  const idsToDelete = docs.slice(1).map(doc => doc._id);
  await collection.deleteMany({ _id: { $in: idsToDelete } });
  console.log(`Deleted ${idsToDelete.length} duplicate super-admin role permission(s).`);
  process.exit(0);
}

fixRolePermissions().catch(e => {
  console.error(e);
  process.exit(1);
});
