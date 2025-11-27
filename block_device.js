import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
config({ path: path.join(__dirname, 'backend', '.env') });

import mongoose from 'mongoose';
import Device from './backend/models/Device.js';

async function blockDeviceByMac(macAddress, ipAddress) {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/autovolt');

        // Check if device already exists
        let device = await Device.findOne({ macAddress: new RegExp('^' + macAddress + '$', 'i') });

        if (device) {
            // Update existing device to blocked
            device.blocked = true;
            device.status = 'offline';
            await device.save();
            console.log(`Existing device ${device.name} (${device.macAddress}) has been blocked`);
        } else {
            // Create a new blocked device entry
            device = new Device({
                name: `Blocked Device (${macAddress})`,
                macAddress: macAddress,
                ipAddress: ipAddress,
                deviceType: 'unknown',
                location: 'Unknown',
                status: 'offline',
                blocked: true,
                switches: [] // No switches for blocked device
            });
            await device.save();
            console.log(`New blocked device created: ${device.name} (${device.macAddress})`);
        }

        console.log(`Device ID: ${device._id}`);

    } catch (error) {
        console.error('Error blocking device:', error);
    } finally {
        await mongoose.disconnect();
    }
}

// Block the specific device
blockDeviceByMac('80:F3:DA:65:47:38', '172.16.3.181');