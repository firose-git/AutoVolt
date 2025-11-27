const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const RolePermissions = require('../models/RolePermissions');
const User = require('../models/User');
const { testUtils, testDb } = global;

describe('Role Management End-to-End Tests', () => {
    let adminToken;
    let facultyToken;
    let studentToken;
    let adminUser;
    let facultyUser;
    let studentUser;

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
    });

    describe('Role Permissions CRUD Operations', () => {
        test('should create role permissions for admin', async () => {
            const rolePermissionsData = {
                role: 'faculty',
                userManagement: {
                    canViewUsers: true,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false,
                    canApproveUsers: true
                },
                deviceManagement: {
                    canViewDevices: true,
                    canControlDevices: true,
                    canAddDevices: false,
                    canEditDevices: false,
                    canDeleteDevices: false
                },
                classroomManagement: {
                    canViewClassrooms: true,
                    canManageClassrooms: false
                }
            };

            const response = await request(app)
                .post('/api/role-permissions')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(rolePermissionsData)
                .expect(201);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data.role).toBe('faculty');
            expect(response.body.data.userManagement.canViewUsers).toBe(true);
            expect(response.body.data.userManagement.canCreateUsers).toBe(false);
        });

        test('should update role permissions for admin', async () => {
            // First create role permissions
            const rolePermissions = new RolePermissions({
                role: 'student',
                userManagement: { canViewUsers: false },
                deviceManagement: { canViewDevices: true, canControlDevices: false }
            });
            await rolePermissions.save();

            // Update permissions
            const updateData = {
                deviceManagement: {
                    canViewDevices: true,
                    canControlDevices: true, // Changed from false to true
                    canCreateDevices: false
                },
                classroomManagement: {
                    canViewClassrooms: true,
                    canCreateClassrooms: false
                }
            };

            const response = await request(app)
                .put('/api/role-permissions/student')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data.role).toBe('student');
            expect(response.body.data.deviceManagement.canControlDevices).toBe(true);
            expect(response.body.data.classroomManagement.canViewClassrooms).toBe(true);
        });

        test('should get role permissions', async () => {
            // Create role permissions
            const rolePermissions = new RolePermissions({
                role: 'faculty',
                userManagement: { canViewUsers: true, canApproveRegistrations: true },
                deviceManagement: { canViewDevices: true, canControlDevices: true }
            });
            await rolePermissions.save();

            const response = await request(app)
                .get('/api/role-permissions/faculty')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data.role).toBe('faculty');
            expect(response.body.data.userManagement.canViewUsers).toBe(true);
            expect(response.body.data.userManagement.canApproveRegistrations).toBe(true);
        });

        test('should reject role permissions operations for non-admin', async () => {
            const rolePermissionsData = {
                role: 'student',
                userManagement: { canViewUsers: true }
            };

            // Try to create as faculty user
            const response = await request(app)
                .post('/api/role-permissions')
                .set('Authorization', `Bearer ${facultyToken}`)
                .send(rolePermissionsData)
                .expect(403);

            expect(response.body).toHaveProperty('message');
        });
    });

    describe('Role Permissions Integration with User Authentication', () => {
        beforeEach(async () => {
            // Create role permissions for faculty
            const facultyPermissions = new RolePermissions({
                role: 'faculty',
                userManagement: {
                    canViewUsers: true,
                    canApproveRegistrations: true,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false
                },
                deviceManagement: {
                    canViewDevices: true,
                    canControlDevices: true,
                    canCreateDevices: false,
                    canEditDevices: false,
                    canDeleteDevices: false
                },
                classroomManagement: {
                    canViewClassrooms: true,
                    canCreateClassrooms: false
                },
                scheduleManagement: {
                    canViewSchedules: true,
                    canCreateSchedules: true,
                    canEditSchedules: false,
                    canDeleteSchedules: false
                }
            });
            await facultyPermissions.save();

            // Create role permissions for student
            const studentPermissions = new RolePermissions({
                role: 'student',
                userManagement: {
                    canViewUsers: false,
                    canApproveRegistrations: false,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false
                },
                deviceManagement: {
                    canViewDevices: true,
                    canControlDevices: false,
                    canCreateDevices: false,
                    canEditDevices: false,
                    canDeleteDevices: false
                },
                classroomManagement: {
                    canViewClassrooms: true,
                    canCreateClassrooms: false
                }
            });
            await studentPermissions.save();
        });

        test('should return merged permissions on login (faculty user)', async () => {
            const loginData = {
                email: 'faculty@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('rolePermissions');

            // Check that role permissions are included
            const rolePermissions = response.body.user.rolePermissions;
            expect(rolePermissions).toHaveProperty('userManagement');
            expect(rolePermissions.userManagement.canViewUsers).toBe(true);
            expect(rolePermissions.userManagement.canApproveRegistrations).toBe(true);
            expect(rolePermissions.deviceManagement.canControlDevices).toBe(true);
        });

        test('should return merged permissions on login (student user)', async () => {
            const loginData = {
                email: 'student@example.com',
                password: 'password123'
            };

            const response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.user).toHaveProperty('rolePermissions');

            // Check that student has restricted permissions
            const rolePermissions = response.body.user.rolePermissions;
            expect(rolePermissions.userManagement.canViewUsers).toBe(false);
            expect(rolePermissions.userManagement.canApproveRegistrations).toBe(false);
            expect(rolePermissions.deviceManagement.canControlDevices).toBe(false);
            expect(rolePermissions.deviceManagement.canViewDevices).toBe(true);
        });

        test('should return updated permissions after role changes', async () => {
            // First login to get initial permissions
            let loginData = {
                email: 'faculty@example.com',
                password: 'password123'
            };

            let response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            expect(response.body.user.rolePermissions.deviceManagement.canCreateDevices).toBe(false);

            // Update faculty role permissions to allow adding devices
            const updateData = {
                deviceManagement: {
                    canViewDevices: true,
                    canControlDevices: true,
                    canCreateDevices: true, // Changed from false to true
                    canEditDevices: false,
                    canDeleteDevices: false
                }
            };

            await request(app)
                .put('/api/role-permissions/faculty')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData)
                .expect(200);

            // Login again to get updated permissions
            response = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            // Check that the permission was updated
            expect(response.body.user.rolePermissions.deviceManagement.canCreateDevices).toBe(true);
        });

        test('should return profile with merged permissions', async () => {
            // Login first to get token
            const loginData = {
                email: 'faculty@example.com',
                password: 'password123'
            };

            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send(loginData)
                .expect(200);

            const userToken = loginResponse.body.token;

            // Get profile
            const profileResponse = await request(app)
                .get('/api/auth/profile')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(200);

            expect(profileResponse.body).toHaveProperty('success', true);
            expect(profileResponse.body).toHaveProperty('user');
            expect(profileResponse.body.user).toHaveProperty('rolePermissions');
            expect(profileResponse.body.user.rolePermissions).toHaveProperty('userManagement');
            expect(profileResponse.body.user.rolePermissions.userManagement.canViewUsers).toBe(true);
        });
    });

    describe('Permission Checking API', () => {
        beforeEach(async () => {
            // Create role permissions
            const facultyPermissions = new RolePermissions({
                role: 'faculty',
                userManagement: { canViewUsers: true, canApproveRegistrations: true },
                deviceManagement: { canViewDevices: true, canControlDevices: true }
            });
            await facultyPermissions.save();
        });

        test('should check specific permission for role', async () => {
            const response = await request(app)
                .get('/api/role-permissions/check/faculty/userManagement/canViewUsers')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('role', 'faculty');
            expect(response.body.data).toHaveProperty('category', 'userManagement');
            expect(response.body.data).toHaveProperty('permission', 'canViewUsers');
            expect(response.body.data).toHaveProperty('hasPermission', true);
        });

        test('should return false for non-existent permission', async () => {
            const response = await request(app)
                .get('/api/role-permissions/check/faculty/userManagement/canDeleteUsers')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.data.hasPermission).toBe(false);
        });
    });

    describe('Role Permissions Initialization', () => {
        test('should initialize default permissions for all roles', async () => {
            const response = await request(app)
                .post('/api/role-permissions/initialize')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('data');
            expect(response.body.data).toHaveProperty('created');
            expect(response.body.data).toHaveProperty('updated');
            expect(response.body.data.totalRoles).toBe(8); // All 8 roles

            // Verify roles were created
            const allRoles = await RolePermissions.find({});
            expect(allRoles.length).toBeGreaterThan(0);
        });
    });
});