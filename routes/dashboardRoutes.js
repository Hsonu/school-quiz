const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const teacherAuth = require('../middleware/teacherAuth');
const studentAuth = require('../middleware/studentAuth');

router.get('/teacher', auth, teacherAuth, dashboardController.getTeacherDashboard);
router.get('/student', auth, studentAuth, dashboardController.getStudentDashboard);

module.exports = router;
