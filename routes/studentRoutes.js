const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const auth = require('../middleware/auth');
const studentAuth = require('../middleware/studentAuth');
const teacherAuth = require('../middleware/teacherAuth');
const upload = require('../config/multer');

// Public routes
router.post('/signup', studentController.signup);
router.post('/login', studentController.login);

// Private routes
router.get('/profile', auth, studentAuth, studentController.getProfile);
router.put('/profile', auth, studentAuth, upload.single('profilePic'), studentController.updateProfile);

// Teacher-specific student access route
router.get('/teacher/students', auth, teacherAuth, studentController.getStudentsForTeacher);

module.exports = router;
