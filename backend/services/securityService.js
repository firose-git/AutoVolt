const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { logger } = require('../middleware/logger');
const Device = require('../models/Device');

class SecurityService {
    constructor() {
        this.rateLimits = new Map();
        this.suspiciousActivities = new Map();
        this.blockedDevices = new Set(); // Cache for blocked device IDs
    }

    // Load blocked devices from database
    async loadBlockedDevices() {
        try {
            const blockedDevices = await Device.find({ blocked: true }, '_id');
            this.blockedDevices = new Set(blockedDevices.map(d => d._id.toString()));
            logger.info(`Loaded ${this.blockedDevices.size} blocked devices`);
        } catch (error) {
            logger.error('Failed to load blocked devices:', error);
        }
    }

    // Block a device by ID
    async blockDevice(deviceId) {
        try {
            await Device.findByIdAndUpdate(deviceId, { blocked: true });
            this.blockedDevices.add(deviceId.toString());
            logger.warn(`Device ${deviceId} has been blocked`);
        } catch (error) {
            logger.error(`Failed to block device ${deviceId}:`, error);
            throw error;
        }
    }

    // Unblock a device by ID
    async unblockDevice(deviceId) {
        try {
            await Device.findByIdAndUpdate(deviceId, { blocked: false });
            this.blockedDevices.delete(deviceId.toString());
            logger.info(`Device ${deviceId} has been unblocked`);
        } catch (error) {
            logger.error(`Failed to unblock device ${deviceId}:`, error);
            throw error;
        }
    }

    // Rate Limiting
    async checkRateLimit(identifier, limit, window) {
        const now = Date.now();
        const key = `${identifier}:${Math.floor(now / window)}`;
        
        const current = this.rateLimits.get(key) || 0;
        if (current >= limit) {
            logger.warn(`Rate limit exceeded for ${identifier}`);
            return false;
        }
        
        this.rateLimits.set(key, current + 1);
        setTimeout(() => this.rateLimits.delete(key), window);
        return true;
    }

    // Device Authentication
    generateDeviceToken(deviceId, secret) {
        return jwt.sign(
            { deviceId, timestamp: Date.now() },
            secret,
            { expiresIn: '24h' }
        );
    }

    verifyDeviceToken(token, secret) {
        try {
            return jwt.verify(token, secret);
        } catch (err) {
            logger.error('Device token verification failed:', err);
            return null;
        }
    }

    // Request Validation
    validateRequest(req, deviceId) {
        const signature = req.headers['x-device-signature'];
        if (!signature) return false;

        const payload = JSON.stringify(req.body);
        const expectedSignature = this.generateSignature(payload, process.env.API_SECRET);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    generateSignature(payload, secret) {
        return crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }

    // Suspicious Activity Detection
    async trackActivity(deviceId, activity) {
        if (!this.suspiciousActivities.has(deviceId)) {
            this.suspiciousActivities.set(deviceId, []);
        }
        
        const activities = this.suspiciousActivities.get(deviceId);
        activities.push({ ...activity, timestamp: new Date() });

        // Check for suspicious patterns
        await this.detectSuspiciousPatterns(deviceId, activities);
    }

    async detectSuspiciousPatterns(deviceId, activities) {
        const recent = activities.filter(a => 
            a.timestamp > new Date(Date.now() - 300000) // Last 5 minutes
        );

        // Check for rapid toggle sequences
        if (recent.filter(a => a.type === 'toggle').length > 20) {
            logger.warn(`Suspicious rapid toggles detected for device ${deviceId}`);
            await this.blockDevice(deviceId);
        }

        // Check for failed auth attempts
        const failedAuth = recent.filter(a => 
            a.type === 'auth_failure'
        ).length;
        if (failedAuth > 5) {
            logger.warn(`Multiple auth failures detected for device ${deviceId}`);
            await this.blockDevice(deviceId);
        }
    }

    isBlacklisted(deviceId) {
        return this.blockedDevices.has(deviceId.toString());
    }

    // Cleanup
    cleanup() {
        const now = Date.now();
        // Clean old rate limits
        for (const [key, value] of this.rateLimits) {
            if (parseInt(key.split(':')[1]) < Math.floor(now / 3600000)) {
                this.rateLimits.delete(key);
            }
        }

        // Clean old activities
        for (const [deviceId, activities] of this.suspiciousActivities) {
            const filtered = activities.filter(a => 
                now - a.timestamp.getTime() < 86400000 // Keep last 24 hours
            );
            if (filtered.length === 0) {
                this.suspiciousActivities.delete(deviceId);
            } else {
                this.suspiciousActivities.set(deviceId, filtered);
            }
        }
    }
}

module.exports = new SecurityService();
