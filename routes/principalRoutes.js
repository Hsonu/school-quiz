const express = require('express');
const router = express.Router();
const principalController = require('../controllers/principalController');
const auth = require('../middleware/auth');
const principalAuth = require('../middleware/principalAuth');
const upload = require('../config/multer');

// Public route
router.post('/login', principalController.login);

// Protected routes (Only accessible to authenticated Principal or Owner)
router.get('/dashboard-stats', auth, principalAuth, principalController.getDashboardStats);

// Department CRUD Management
router.get('/departments', auth, principalAuth, principalController.getDepartments);
router.post('/departments', auth, principalAuth, principalController.addDepartment);
router.put('/departments/:id', auth, principalAuth, principalController.updateDepartment);
router.delete('/departments/:id', auth, principalAuth, principalController.deleteDepartment);

// Course CRUD Management
router.get('/courses', auth, principalController.getCourses);
router.post('/courses', auth, principalAuth, principalController.addCourse);
router.put('/courses/:id', auth, principalAuth, principalController.updateCourse);
router.delete('/courses/:id', auth, principalAuth, principalController.deleteCourse);

// Semester CRUD Management
router.get('/semesters', auth, principalController.getSemesters);
router.post('/semesters', auth, principalAuth, principalController.addSemester);
router.put('/semesters/:id', auth, principalAuth, principalController.updateSemester);
router.delete('/semesters/:id', auth, principalAuth, principalController.deleteSemester);

// Subject CRUD Management (Only Principal can create/edit/delete Subjects)
router.get('/subjects', auth, principalAuth, principalController.getSubjects);
router.post('/subjects', auth, principalAuth, principalController.addSubject);
router.put('/subjects/:id', auth, principalAuth, principalController.updateSubject);
router.delete('/subjects/:id', auth, principalAuth, principalController.deleteSubject);

// Teacher CRUD & Subject Assignment
router.get('/teachers', auth, principalAuth, principalController.getTeachers);
router.put('/teachers/:id', auth, principalAuth, principalController.updateTeacher);
router.delete('/teachers/:id', auth, principalAuth, principalController.deleteTeacher);
router.post('/teachers/assign-subjects', auth, principalAuth, principalController.assignSubjects);

// Student CRUD Management
router.get('/students', auth, principalAuth, principalController.getStudents);
router.post('/students', auth, principalAuth, principalController.addStudent);
router.put('/students/:id', auth, principalAuth, principalController.updateStudent);
router.delete('/students/:id', auth, principalAuth, principalController.deleteStudent);

// Timetable CRUD Management
router.get('/timetables', auth, principalAuth, principalController.getTimetables);
router.post('/timetables', auth, principalAuth, principalController.addTimetable);
router.put('/timetables/:id', auth, principalAuth, principalController.updateTimetable);
router.delete('/timetables/:id', auth, principalAuth, principalController.deleteTimetable);

// Exam Approval Control
router.get('/exams/pending', auth, principalAuth, principalController.getPendingExams);
router.put('/exams/:id/approve', auth, principalAuth, principalController.approveExam);
router.delete('/exams/:id/reject', auth, principalAuth, principalController.rejectExam);

// Profile Management
router.get('/profile', auth, principalAuth, principalController.getProfile);
router.put('/profile', auth, principalAuth, upload.single('profilePic'), principalController.updateProfile);

module.exports = router;
