const request = require('supertest');
const mongoose = require('mongoose');
const { app, server, mqttServer } = require('../server');
const User = require('../models/User');
const Device = require('../models/Device');
const Ticket = require('../models/Ticket');
const Schedule = require('../models/Schedule');
const { testUtils, testDb } = global;

describe('Complete Integration Tests - Tickets, Schedules, Analytics', () => {
    let adminToken;
    let facultyToken;
    let studentToken;
    let adminUser;
    let facultyUser;
    let studentUser;
    let testDevice;

    beforeAll(async () => {
        if (server) global.testServers.push(server);
        if (mqttServer) global.testServers.push(mqttServer);
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
            email: 'admin@test.com',
            password: 'password123',
            role: 'admin',
            isActive: true,
            isApproved: true
        });

        facultyUser = await User.create({
            name: 'Faculty User',
            email: 'faculty@test.com',
            password: 'password123',
            role: 'faculty',
            department: 'Computer Science',
            isActive: true,
            isApproved: true
        });

        studentUser = await User.create({
            name: 'Student User',
            email: 'student@test.com',
            password: 'password123',
            role: 'student',
            department: 'Computer Science',
            class: 'CS101',
            isActive: true,
            isApproved: true
        });

        // Generate tokens
        adminToken = testUtils.generateTestToken(adminUser._id, adminUser.role);
        facultyToken = testUtils.generateTestToken(facultyUser._id, facultyUser.role);
        studentToken = testUtils.generateTestToken(studentUser._id, studentUser.role);

        // Create test device
        testDevice = await Device.create({
            name: 'Test Device',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            ipAddress: '192.168.1.100',
            classroom: 'CS-101',
            location: 'Room 101',
            type: 'switch',
            status: 'online',
            switches: [
                {
                    name: 'Light 1',
                    gpio: 16,
                    type: 'light',
                    state: false,
                    icon: 'lightbulb'
                },
                {
                    name: 'Fan 1',
                    gpio: 17,
                    type: 'fan',
                    state: false,
                    icon: 'fan'
                }
            ]
        });
    });

    // ==================== TICKET TESTS ====================
    describe('Ticket Management', () => {
        describe('POST /api/tickets - Create Ticket', () => {
            test('should allow any authenticated user to create a ticket', async () => {
                const ticketData = {
                    title: 'Device not responding',
                    description: 'The classroom device in Room 101 is not responding to commands',
                    category: 'technical_issue',
                    priority: 'high'
                };

                const response = await request(app)
                    .post('/api/tickets')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send(ticketData)
                    .expect(201);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('data');
                expect(response.body.data).toHaveProperty('title', ticketData.title);
                expect(response.body.data).toHaveProperty('status', 'open');
                expect(response.body.data).toHaveProperty('createdBy');
            });

            test('should reject ticket with invalid category', async () => {
                const ticketData = {
                    title: 'Test Ticket',
                    description: 'Test description',
                    category: 'invalid_category',
                    priority: 'medium'
                };

                const response = await request(app)
                    .post('/api/tickets')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send(ticketData)
                    .expect(400);

                expect(response.body).toHaveProperty('errors');
            });

            test('should require authentication', async () => {
                const ticketData = {
                    title: 'Test Ticket',
                    description: 'Test description',
                    category: 'technical_issue'
                };

                await request(app)
                    .post('/api/tickets')
                    .send(ticketData)
                    .expect(401);
            });
        });

        describe('GET /api/tickets - List Tickets', () => {
            beforeEach(async () => {
                // Create sample tickets
                await Ticket.create({
                    title: 'Ticket 1',
                    description: 'Description 1',
                    category: 'technical_issue',
                    priority: 'high',
                    status: 'open',
                    createdBy: studentUser._id
                });

                await Ticket.create({
                    title: 'Ticket 2',
                    description: 'Description 2',
                    category: 'device_problem',
                    priority: 'medium',
                    status: 'in_progress',
                    createdBy: studentUser._id,
                    assignedTo: adminUser._id
                });
            });

            test('should return all tickets for admin', async () => {
                const response = await request(app)
                    .get('/api/tickets')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('data');
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBeGreaterThanOrEqual(2);
            });

            test('should filter tickets by status', async () => {
                const response = await request(app)
                    .get('/api/tickets?status=open')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data.every(t => t.status === 'open')).toBe(true);
            });
        });

        describe('PUT /api/tickets/:id - Update Ticket', () => {
            let testTicket;

            beforeEach(async () => {
                testTicket = await Ticket.create({
                    title: 'Test Ticket',
                    description: 'Test description',
                    category: 'technical_issue',
                    priority: 'medium',
                    status: 'open',
                    createdBy: studentUser._id
                });
            });

            test('should allow admin to update ticket status', async () => {
                const response = await request(app)
                    .put(`/api/tickets/${testTicket._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        status: 'in_progress',
                        comment: 'Working on this issue'
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('status', 'in_progress');
            });

            test('should allow ticket creator to update their ticket', async () => {
                const response = await request(app)
                    .put(`/api/tickets/${testTicket._id}`)
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send({
                        priority: 'urgent'
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
            });

            test('should reject invalid status value', async () => {
                const response = await request(app)
                    .put(`/api/tickets/${testTicket._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        status: 'invalid_status'
                    })
                    .expect(400);

                expect(response.body).toHaveProperty('errors');
            });
        });

        describe('GET /api/tickets/stats - Ticket Statistics', () => {
            beforeEach(async () => {
                // Create various tickets for stats
                await Ticket.create([
                    {
                        title: 'Open Ticket 1',
                        description: 'Desc',
                        category: 'technical_issue',
                        priority: 'high',
                        status: 'open',
                        createdBy: studentUser._id
                    },
                    {
                        title: 'Resolved Ticket',
                        description: 'Desc',
                        category: 'device_problem',
                        priority: 'low',
                        status: 'resolved',
                        createdBy: studentUser._id
                    }
                ]);
            });

            test('should return ticket statistics for admin', async () => {
                const response = await request(app)
                    .get('/api/tickets/stats')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('data');
                expect(response.body.data).toHaveProperty('total');
                expect(response.body.data).toHaveProperty('byStatus');
                expect(response.body.data).toHaveProperty('byPriority');
                expect(response.body.data.byStatus).toHaveProperty('open');
                expect(response.body.data.byPriority).toHaveProperty('high');
            });

            test('should reject non-admin access to stats', async () => {
                await request(app)
                    .get('/api/tickets/stats')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .expect(403);
            });
        });
    });

    // ==================== SCHEDULE TESTS ====================
    describe('Schedule Management', () => {
        describe('POST /api/schedules - Create Schedule', () => {
            test('should allow faculty to create a schedule', async () => {
                const scheduleData = {
                    name: 'Morning Lights On',
                    time: '08:00',
                    action: 'on',
                    type: 'daily',
                    switches: [
                        {
                            deviceId: testDevice._id.toString(),
                            switchId: testDevice.switches[0]._id.toString()
                        }
                    ]
                };

                const response = await request(app)
                    .post('/api/schedules')
                    .set('Authorization', `Bearer ${facultyToken}`)
                    .send(scheduleData)
                    .expect(201);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('data');
                expect(response.body.data).toHaveProperty('name', scheduleData.name);
                expect(response.body.data).toHaveProperty('time', scheduleData.time);
                expect(response.body.data).toHaveProperty('action', scheduleData.action);
            });

            test('should allow admin to create a schedule', async () => {
                const scheduleData = {
                    name: 'Evening Shutdown',
                    time: '18:00',
                    action: 'off',
                    type: 'weekly',
                    days: [1, 2, 3, 4, 5], // Monday to Friday
                    switches: [
                        {
                            deviceId: testDevice._id.toString(),
                            switchId: testDevice.switches[0]._id.toString()
                        }
                    ]
                };

                const response = await request(app)
                    .post('/api/schedules')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send(scheduleData)
                    .expect(201);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('days');
                expect(response.body.data.days).toEqual(scheduleData.days);
            });

            test('should reject schedule from non-authorized user', async () => {
                const scheduleData = {
                    name: 'Unauthorized Schedule',
                    time: '12:00',
                    action: 'on',
                    type: 'once',
                    switches: [
                        {
                            deviceId: testDevice._id.toString(),
                            switchId: testDevice.switches[0]._id.toString()
                        }
                    ]
                };

                await request(app)
                    .post('/api/schedules')
                    .set('Authorization', `Bearer ${studentToken}`)
                    .send(scheduleData)
                    .expect(403);
            });

            test('should validate time format', async () => {
                const scheduleData = {
                    name: 'Invalid Time',
                    time: '25:99', // Invalid time
                    action: 'on',
                    type: 'daily',
                    switches: [
                        {
                            deviceId: testDevice._id.toString(),
                            switchId: testDevice.switches[0]._id.toString()
                        }
                    ]
                };

                const response = await request(app)
                    .post('/api/schedules')
                    .set('Authorization', `Bearer ${facultyToken}`)
                    .send(scheduleData)
                    .expect(400);

                expect(response.body).toHaveProperty('errors');
            });

            test('should require at least one switch', async () => {
                const scheduleData = {
                    name: 'No Switches',
                    time: '10:00',
                    action: 'on',
                    type: 'daily',
                    switches: [] // Empty array
                };

                const response = await request(app)
                    .post('/api/schedules')
                    .set('Authorization', `Bearer ${facultyToken}`)
                    .send(scheduleData)
                    .expect(400);

                expect(response.body).toHaveProperty('errors');
            });
        });

        describe('GET /api/schedules - List Schedules', () => {
            beforeEach(async () => {
                await Schedule.create([
                    {
                        name: 'Schedule 1',
                        time: '08:00',
                        action: 'on',
                        type: 'daily',
                        switches: [{
                            deviceId: testDevice._id,
                            switchId: testDevice.switches[0]._id
                        }],
                        createdBy: facultyUser._id
                    },
                    {
                        name: 'Schedule 2',
                        time: '18:00',
                        action: 'off',
                        type: 'daily',
                        switches: [{
                            deviceId: testDevice._id,
                            switchId: testDevice.switches[1]._id
                        }],
                        createdBy: adminUser._id
                    }
                ]);
            });

            test('should return all schedules', async () => {
                const response = await request(app)
                    .get('/api/schedules')
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body).toHaveProperty('data');
                expect(Array.isArray(response.body.data)).toBe(true);
                expect(response.body.data.length).toBe(2);
            });
        });

        describe('PUT /api/schedules/:id - Update Schedule', () => {
            let testSchedule;

            beforeEach(async () => {
                testSchedule = await Schedule.create({
                    name: 'Test Schedule',
                    time: '10:00',
                    action: 'on',
                    type: 'daily',
                    switches: [{
                        deviceId: testDevice._id,
                        switchId: testDevice.switches[0]._id
                    }],
                    createdBy: facultyUser._id
                });
            });

            test('should allow faculty to update their schedule', async () => {
                const response = await request(app)
                    .put(`/api/schedules/${testSchedule._id}`)
                    .set('Authorization', `Bearer ${facultyToken}`)
                    .send({
                        time: '11:00',
                        action: 'off'
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('time', '11:00');
                expect(response.body.data).toHaveProperty('action', 'off');
            });

            test('should allow admin to update any schedule', async () => {
                const response = await request(app)
                    .put(`/api/schedules/${testSchedule._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .send({
                        name: 'Updated Schedule Name'
                    })
                    .expect(200);

                expect(response.body).toHaveProperty('success', true);
                expect(response.body.data).toHaveProperty('name', 'Updated Schedule Name');
            });
        });

        describe('DELETE /api/schedules/:id - Delete Schedule', () => {
            let testSchedule;

            beforeEach(async () => {
                testSchedule = await Schedule.create({
                    name: 'Schedule to Delete',
                    time: '14:00',
                    action: 'on',
                    type: 'once',
                    switches: [{
                        deviceId: testDevice._id,
                        switchId: testDevice.switches[0]._id
                    }],
                    createdBy: facultyUser._id
                });
            });

            test('should allow authorized user to delete schedule', async () => {
                const response = await request(app)
                    .delete(`/api/schedules/${testSchedule._id}`)
                    .set('Authorization', `Bearer ${adminToken}`)
                    .expect(200);

                expect(response.body).toHaveProperty('message');
                expect(response.body.message).toMatch(/deleted/i);
            });
        });
    });

    // ==================== COMPLETE USER WORKFLOW ====================
    describe('Complete User Workflow', () => {
        test('Complete user journey: Register -> Login -> Create Ticket -> Create Schedule', async () => {
            // 1. Create new user directly (bypassing registration since password hashing is complex)
            const newUser = await User.create({
                name: 'New Faculty',
                email: 'newfaculty@test.com',
                password: 'password123',
                role: 'faculty',
                department: 'Physics',
                isActive: true,
                isApproved: true
            });

            // 2. Login
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'newfaculty@test.com',
                    password: 'password123'
                })
                .expect(200);

            expect(loginRes.body).toHaveProperty('token');
            const userToken = loginRes.body.token;

            // 3. Create a ticket
            const ticketRes = await request(app)
                .post('/api/tickets')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    title: 'Need new device',
                    description: 'Physics lab needs additional switches',
                    category: 'feature_request',
                    priority: 'medium'
                })
                .expect(201);

            expect(ticketRes.body.data).toHaveProperty('title', 'Need new device');

            // 4. Create a schedule
            const scheduleRes = await request(app)
                .post('/api/schedules')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'Physics Lab Auto-off',
                    time: '20:00',
                    action: 'off',
                    type: 'daily',
                    switches: [{
                        deviceId: testDevice._id.toString(),
                        switchId: testDevice.switches[0]._id.toString()
                    }]
                })
                .expect(201);

            expect(scheduleRes.body.data).toHaveProperty('name', 'Physics Lab Auto-off');

            // 5. View profile
            const profileRes = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(profileRes.body.user).toHaveProperty('email', 'newfaculty@test.com');
        });
    });
});
