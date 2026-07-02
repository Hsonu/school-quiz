const express = require('express');
const router = express.Router();
const ownerController = require('../controllers/ownerController');
const auth = require('../middleware/auth');
const ownerAuth = require('../middleware/ownerAuth');

// Public Owner login
router.post('/login', ownerController.login);

// Protected routes (Only accessible to authenticated Owner)
router.get('/dashboard-stats', auth, ownerAuth, ownerController.getDashboardStats);

// Teacher CRUD Management
router.get('/teachers', auth, ownerAuth, ownerController.getTeachers);
router.post('/teachers', auth, ownerAuth, ownerController.addTeacher);
router.put('/teachers/:id', auth, ownerAuth, ownerController.updateTeacher);
router.put('/teachers/:id/reset-password', auth, ownerAuth, ownerController.resetTeacherPassword);
router.delete('/teachers/:id', auth, ownerAuth, ownerController.deleteTeacher);

// Student CRUD Management
router.get('/students', auth, ownerAuth, ownerController.getStudents);
router.post('/students', auth, ownerAuth, ownerController.addStudent);
router.put('/students/:id', auth, ownerAuth, ownerController.updateStudent);
router.delete('/students/:id', auth, ownerAuth, ownerController.deleteStudent);
router.get('/students/:id/profile-data', auth, ownerAuth, ownerController.getStudentProfileData);

// Auxiliary lists
router.get('/classes', auth, ownerAuth, ownerController.getAllClasses);
router.get('/subjects', auth, ownerAuth, ownerController.getAllSubjects);

// Attendance records
router.get('/attendance', auth, ownerAuth, ownerController.getAttendanceLogs);
router.post('/attendance', auth, ownerAuth, ownerController.logAttendance);

const multer = require('multer');
const uploadDoc = multer({ dest: 'uploads/' });

// Principal CRUD Management
router.get('/principals', auth, ownerAuth, ownerController.getPrincipals);
router.post('/principals', auth, ownerAuth, ownerController.addPrincipal);
router.put('/principals/:id', auth, ownerAuth, ownerController.updatePrincipal);
router.delete('/principals/:id', auth, ownerAuth, ownerController.deletePrincipal);
router.put('/principals/:id/reset-password', auth, ownerAuth, ownerController.resetPrincipalPassword);

// College & Settings Management
router.get('/colleges', auth, ownerAuth, ownerController.getColleges);
router.post('/colleges', auth, ownerAuth, ownerController.addCollege);
router.get('/settings', auth, ownerAuth, ownerController.getSettings);
router.put('/settings', auth, ownerAuth, ownerController.updateSettings);

// Backup & Restore
router.get('/backup', auth, ownerAuth, ownerController.backupDatabase);
router.post('/restore', auth, ownerAuth, uploadDoc.single('backupFile'), ownerController.restoreDatabase);

// Permissions management
router.put('/users/:id/permissions', auth, ownerAuth, ownerController.updatePermissions);

// Filtered report query
router.get('/reports', auth, ownerAuth, ownerController.generateReport);

module.exports = router;
