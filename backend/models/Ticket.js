const mongoose = require('mongoose');
const Counter = require('./Counter');

const ticketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        unique: true,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    category: {
        type: String,
        enum: [
            'technical_issue',
            'device_problem',
            'network_issue',
            'software_bug',
            'feature_request',
            'account_issue',
            'security_concern',
            'other'
        ],
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'on_hold', 'resolved', 'closed', 'cancelled'],
        default: 'open',
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    department: {
        type: String,
        trim: true
    },
    location: {
        type: String,
        trim: true
    },
    deviceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
    },
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        authorName: String,
        message: {
            type: String,
            required: true,
            trim: true
        },
        isInternal: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    tags: [{
        type: String,
        trim: true
    }],
    mentionedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    resolution: {
        type: String,
        trim: true
    },
    resolvedAt: Date,
    closedAt: Date,
    estimatedHours: Number,
    actualHours: Number
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (doc, ret) {
            ret.id = ret._id;
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for performance
ticketSchema.index({ createdBy: 1, createdAt: -1 });
ticketSchema.index({ assignedTo: 1, status: 1 });
ticketSchema.index({ status: 1, priority: 1, createdAt: -1 });
ticketSchema.index({ category: 1, status: 1 });
ticketSchema.index({ ticketId: 1 });
ticketSchema.index({ department: 1, status: 1 }); // For dept-filtered stats
ticketSchema.index({ priority: 1 }); // For priority aggregation
ticketSchema.index({ resolvedAt: 1, createdAt: 1 }); // For resolution time calculation

// Virtual for days open
ticketSchema.virtual('daysOpen').get(function () {
    const endDate = this.closedAt || this.resolvedAt || new Date();
    const startDate = this.createdAt;
    const diffTime = Math.abs(endDate - startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-validate middleware to generate ticket ID
ticketSchema.pre('validate', async function(next) {
    console.log('PRE-VALIDATE MIDDLEWARE CALLED!');
    console.log('this.isNew:', this.isNew);
    console.log('this.ticketId:', this.ticketId);
    if (this.isNew && !this.ticketId) {
        try {
            console.log('About to get next sequence...');
            const seq = await Counter.getNextSequence('ticketId');
            console.log('Got sequence:', seq);
            const year = new Date().getFullYear();
            this.ticketId = `TKT-${year}-${String(seq).padStart(4, '0')}`;
            console.log('Generated ticketId:', this.ticketId);
            next();
        } catch (err) {
            console.error('Error generating ticket ID:', err);
            next(err);
        }
    } else {
        console.log('Skipping ticket ID generation');
        next();
    }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

module.exports = Ticket;
