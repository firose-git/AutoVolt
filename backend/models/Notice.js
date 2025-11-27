// Notice model stub - Notice board functionality has been removed
// This stub prevents import errors while the codebase is cleaned up

const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  // Empty schema - functionality removed
}, {
  timestamps: true
});

// Create a stub model that throws an error when used
const Notice = mongoose.model('Notice', noticeSchema);

// Override all methods to indicate functionality is removed
Notice.find = () => Promise.reject(new Error('Notice board functionality has been removed'));
Notice.findById = () => Promise.reject(new Error('Notice board functionality has been removed'));
Notice.findOne = () => Promise.reject(new Error('Notice board functionality has been removed'));
Notice.create = () => Promise.reject(new Error('Notice board functionality has been removed'));
Notice.findByIdAndUpdate = () => Promise.reject(new Error('Notice board functionality has been removed'));
Notice.findByIdAndDelete = () => Promise.reject(new Error('Notice board functionality has been removed'));

module.exports = Notice;