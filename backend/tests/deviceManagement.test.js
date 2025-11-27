const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const Device = require('../models/Device');
const User = require('../models/User');
const { testUtils, testDb } = global;

describe('Device Management End-to-End Tests', () => {
    let adminToken;
    let facultyToken;
    let studentToken;
    let adminUser;
    let facultyUser;
    let studentUser;
    let testDevice;

    beforeAll(async () => {
        await testDb.connect();
    });

    afterAll(async () => {
        await testDb.disconnect();
    });

    beforeEach(async () => {
        await testDb.clear();

        // Create test users
        adminUser = await User.create({
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'password123',
            role: 'admin',
            isActive: true,
            isApproved: true
        });

        facultyUser = await User.create({
            name: 'Faculty User',
            email: 'faculty@example.com',
            password: 'password123',
            role: 'faculty',
            department: 'Computer Science',
            isActive: true,
            isApproved: true
        });

        studentUser = await User.create({
            name: 'Student User',
            email: 'student@example.com',
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
            isActive: true,
            isApproved: true
        });

        // Generate tokens
        adminToken = testUtils.generateTestToken(adminUser._id, adminUser.role);
        facultyToken = testUtils.generateTestToken(facultyUser._id, facultyUser.role);
        studentToken = testUtils.generateTestToken(studentUser._id, studentUser.role);

        // Create a test device
        testDevice = await Device.create({
            name: 'Test Classroom Device',
            macAddress: 'aa:bb:cc:dd:ee:ff',
            ipAddress: '192.168.1.100',
            classroom: 'Computer Science-101',
            location: 'Room 101',
            type: 'switch',
            status: 'online',
            switches: [
                {
                    name: 'Main Light',
                    gpio: 16,
                    type: 'light',
                    state: false
                },
                {
                    name: 'Projector',
                    gpio: 17,
                    type: 'projector',
                    state: false
                }
            ]
        });
    });

    describe('Device CRUD Operations', () => {
        test('should create device successfully for admin', async () => {
            const deviceData = {
                name: 'New Classroom Device',
                macAddress: 'bb:cc:dd:ee:ff:aa',
                ipAddress: '192.168.1.101',
                classroom: 'Physics-201',
                location: 'Room 201',
                type: 'switch',
                switches: [
                    {
                        name: 'Room Light',
                        gpio: 18,
                        type: 'light',
                        state: false
                    }
                ]
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(deviceData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('name', 'New Classroom Device');
            expect(response.body.data).toHaveProperty('macAddress', 'bb:cc:dd:ee:ff:aa');
            expect(response.body.data).toHaveProperty('classroom', 'Physics-201');
            expect(response.body.data.switches).toHaveLength(1);
            expect(response.body.data.switches[0]).toHaveProperty('name', 'Room Light');
        });

        test('should update device successfully for admin', async () => {
            const updateData = {
                name: 'Updated Classroom Device',
                location: 'Updated Room 101',
                classroom: 'CS-101'
            };

            const response = await request(app)
                .put(`/api/devices/${testDevice._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('name', 'Updated Classroom Device');
            expect(response.body.data).toHaveProperty('location', 'Updated Room 101');
            expect(response.body.data).toHaveProperty('classroom', 'CS-101');
        });

        test('should get device details for admin', async () => {
            const response = await request(app)
                .get(`/api/devices/${testDevice._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('name', 'Test Classroom Device');
            expect(response.body.data).toHaveProperty('macAddress', 'aa:bb:cc:dd:ee:ff');
            expect(response.body.data).toHaveProperty('switches');
            expect(response.body.data.switches).toHaveLength(2);
        });

        test('should list all devices for admin', async () => {
            const response = await request(app)
                .get('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        test('should delete device for admin', async () => {
            const response = await request(app)
                .delete(`/api/devices/${testDevice._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('message');
            expect(response.body.message).toMatch(/deleted/i);

            // Verify device is deleted
            const deletedDevice = await Device.findById(testDevice._id);
            expect(deletedDevice).toBeNull();
        });

        test('should reject device operations for non-admin', async () => {
            // Try to create device as student
            const deviceData = {
                name: 'Unauthorized Device',
                macAddress: 'cc:dd:ee:ff:aa:bb',
                ipAddress: '192.168.1.102',
                classroom: 'Test Room'
            };

            const createResponse = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${studentToken}`)
                .send(deviceData)
                .expect(403);

            expect(createResponse.body).toHaveProperty('message');

            // Try to update device as faculty
            const updateResponse = await request(app)
                .put(`/api/devices/${testDevice._id}`)
                .set('Authorization', `Bearer ${facultyToken}`)
                .send({ name: 'Unauthorized Update' })
                .expect(403);

            expect(updateResponse.body).toHaveProperty('message');
        });
    });

    describe('Device Switch Operations', () => {
        test('should toggle switch successfully for admin', async () => {
            const switchId = testDevice.switches[0]._id;

            const response = await request(app)
                .post(`/api/devices/${testDevice._id}/switches/${switchId}/toggle`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ state: true })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('hardwareDispatch');

            // Verify switch state was updated in database
            const updatedDevice = await Device.findById(testDevice._id);
            expect(updatedDevice.switches[0].state).toBe(true);
        });

        test('should handle multiple switch toggles', async () => {
            const switch1Id = testDevice.switches[0]._id;
            const switch2Id = testDevice.switches[1]._id;

            // Toggle first switch on
            await request(app)
                .post(`/api/devices/${testDevice._id}/switches/${switch1Id}/toggle`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ state: true })
                .expect(200);

            // Toggle second switch on
            await request(app)
                .post(`/api/devices/${testDevice._id}/switches/${switch2Id}/toggle`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ state: true })
                .expect(200);

            // Verify both switches are on
            const updatedDevice = await Device.findById(testDevice._id);
            expect(updatedDevice.switches[0].state).toBe(true);
            expect(updatedDevice.switches[1].state).toBe(true);
        });

        test('should reject switch toggle for invalid device', async () => {
            const fakeDeviceId = new mongoose.Types.ObjectId();
            const fakeSwitchId = new mongoose.Types.ObjectId();

            const response = await request(app)
                .post(`/api/devices/${fakeDeviceId}/switches/${fakeSwitchId}/toggle`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ state: true })
                .expect(404);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Device Statistics and Monitoring', () => {
        test('should return device statistics', async () => {
            const response = await request(app)
                .get('/api/devices/stats')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('totalDevices');
            expect(response.body.data).toHaveProperty('onlineDevices');
            expect(response.body.data).toHaveProperty('totalSwitches');
            expect(typeof response.body.data.totalDevices).toBe('number');
        });

        test('should handle device status updates', async () => {
            // Update device status
            const updateData = {
                status: 'offline',
                lastSeen: new Date()
            };

            const response = await request(app)
                .put(`/api/devices/${testDevice._id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);

            // Verify status was updated
            const updatedDevice = await Device.findById(testDevice._id);
            expect(updatedDevice.status).toBe('offline');
        });
    });

    describe('Device Validation and Error Handling', () => {
        test('should reject duplicate MAC address', async () => {
            const deviceData = {
                name: 'Duplicate MAC Device',
                macAddress: 'aa:bb:cc:dd:ee:ff', // Same as existing device
                ipAddress: '192.168.1.103',
                classroom: 'Test Room'
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(deviceData)
                .expect(400); // API validation error

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Validation failed');
        });

        test('should reject duplicate IP address', async () => {
            const deviceData = {
                name: 'Duplicate IP Device',
                macAddress: 'cc:dd:ee:ff:aa:bb',
                ipAddress: '192.168.1.100', // Same as existing device
                classroom: 'Test Room'
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(deviceData)
                .expect(400); // API validation error

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toBe('Validation failed');
        });

        test('should validate required fields', async () => {
            const invalidDeviceData = {
                name: 'Invalid Device'
                // Missing required fields: macAddress, ipAddress, classroom, location
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidDeviceData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('details');
            expect(Array.isArray(response.body.details)).toBe(true);
        });

        test('should validate MAC address format', async () => {
            const invalidDeviceData = {
                name: 'Invalid MAC Device',
                macAddress: 'invalid-mac-address',
                ipAddress: '192.168.1.104',
                classroom: 'Test Room',
                location: 'Test Location'
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidDeviceData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body).toHaveProperty('details');
            expect(Array.isArray(response.body.details)).toBe(true);
        });
    });

    describe('Device GPIO and Hardware Validation', () => {
        test('should validate GPIO pin conflicts', async () => {
            const invalidDeviceData = {
                name: 'GPIO Conflict Device',
                macAddress: 'dd:ee:ff:aa:bb:cc',
                ipAddress: '192.168.1.105',
                classroom: 'Test Room',
                location: 'Test Location',
                switches: [
                    {
                        name: 'Switch 1',
                        gpio: 16,
                        type: 'light',
                        state: false
                    },
                    {
                        name: 'Switch 2',
                        gpio: 16, // Same GPIO as Switch 1
                        type: 'fan',
                        state: false
                    }
                ]
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidDeviceData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
            expect(response.body.error).toMatch(/GPIO Validation Failed/i);
            expect(response.body).toHaveProperty('errors');
            expect(Array.isArray(response.body.errors)).toBe(true);
        });

        test('should accept valid GPIO configuration', async () => {
            const validDeviceData = {
                name: 'Valid GPIO Device',
                macAddress: 'ee:ff:aa:bb:cc:dd',
                ipAddress: '192.168.1.106',
                classroom: 'Test Room',
                location: 'Test Location',
                switches: [
                    {
                        name: 'Light Switch',
                        gpio: 16,
                        type: 'light',
                        state: false
                    },
                    {
                        name: 'Fan Switch',
                        gpio: 17,
                        type: 'fan',
                        state: false
                    }
                ]
            };

            const response = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(validDeviceData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data.switches).toHaveLength(2);
        });
    });

    describe('Device End-to-End Workflow', () => {
        test('should complete full device lifecycle', async () => {
            // 1. Create device
            const deviceData = {
                name: 'Lifecycle Test Device',
                macAddress: 'ff:aa:bb:cc:dd:ee',
                ipAddress: '192.168.1.107',
                classroom: 'Lifecycle Test Room',
                location: 'Test Building',
                switches: [
                    {
                        name: 'Test Switch',
                        gpio: 18,
                        type: 'light',
                        state: false
                    }
                ]
            };

            const createResponse = await request(app)
                .post('/api/devices')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(deviceData)
                .expect(201);

            const deviceId = createResponse.body.data.id;

            // 2. Get device details
            const getResponse = await request(app)
                .get(`/api/devices/${deviceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(getResponse.body.data.name).toBe('Lifecycle Test Device');

            // 3. Toggle switch
            const switchId = getResponse.body.data.switches[0]._id || getResponse.body.data.switches[0].id;
            await request(app)
                .post(`/api/devices/${deviceId}/switches/${switchId}/toggle`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ state: true })
                .expect(202); // Accepted for async operation

            // 4. Update device
            await request(app)
                .put(`/api/devices/${deviceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Updated Lifecycle Device' })
                .expect(200);

            // 5. Delete device
            await request(app)
                .delete(`/api/devices/${deviceId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            // 6. Verify device is deleted
            const deletedDevice = await Device.findById(deviceId);
            expect(deletedDevice).toBeNull();
        });
    });
});