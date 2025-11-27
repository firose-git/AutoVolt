const mongoose = require('mongoose');

const contentFeedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['rss', 'social_media', 'weather', 'database', 'webhook']
  },
  source: {
    type: String,
    required: true // URL for RSS, API endpoint for others
  },
  config: {
    // RSS specific config
    updateInterval: { type: Number, default: 30 }, // minutes
    maxItems: { type: Number, default: 10 },
    categories: [{ type: String }],
    autoPublish: { type: Boolean, default: false },
    contentRetentionDays: { type: Number, default: 7 },
    filters: {
      keywords: [{ type: String }],
      categories: [{ type: String }],
      maxAgeHours: { type: Number }
    },

    // Social media specific config
    platform: { type: String, enum: ['instagram', 'twitter', 'facebook'] },
    accessToken: { type: String },
    hashtags: [{ type: String }],
    accounts: [{ type: String }],

    // Weather specific config
    apiKey: { type: String },
    location: { type: String },
    units: { type: String, enum: ['metric', 'imperial'], default: 'metric' },
    updateInterval: { type: Number, default: 60 }, // minutes

    // Database specific config
    connectionString: { type: String },
    query: { type: String },
    updateInterval: { type: Number, default: 15 }, // minutes

    // Webhook specific config
    secret: { type: String },
    headers: { type: mongoose.Schema.Types.Mixed }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'active'
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    itemCount: { type: Number, default: 0 },
    lastFetchStatus: { type: String },
    lastError: { type: String },
    feedTitle: { type: String },
    feedDescription: { type: String },
    totalItemsProcessed: { type: Number, default: 0 },
    lastItemDate: { type: Date }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
contentFeedSchema.index({ type: 1, status: 1 });
contentFeedSchema.index({ lastUpdated: -1 });

// Pre-save middleware to update the updatedAt field
contentFeedSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get feeds by type
contentFeedSchema.statics.getFeedsByType = function(type) {
  return this.find({ type, status: 'active' });
};

// Instance method to update metadata
contentFeedSchema.methods.updateMetadata = function(updates) {
  Object.assign(this.metadata, updates);
  return this.save();
};

// Instance method to log error
contentFeedSchema.methods.logError = function(error) {
  this.metadata.lastFetchStatus = 'error';
  this.metadata.lastError = error.message;
  return this.save();
};

// Instance method to log success
contentFeedSchema.methods.logSuccess = function(itemCount = 0) {
  this.metadata.lastFetchStatus = 'success';
  this.metadata.lastError = null;
  if (itemCount > 0) {
    this.metadata.itemCount = itemCount;
    this.metadata.totalItemsProcessed += itemCount;
  }
  this.lastUpdated = new Date();
  return this.save();
};

module.exports = mongoose.model('ContentFeed', contentFeedSchema);