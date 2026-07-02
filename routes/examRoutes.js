const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const auth = require('../middleware/auth');
const teacherAuth = require('../middleware/teacherAuth');
const studentAuth = require('../middleware/studentAuth');

// Retrieve exams
router.get('/', auth, examController.getExams);
router.get('/:id', auth, examController.getExamDetails);

// Manage exams (Teacher privileges)
router.post('/', auth, teacherAuth, examController.createExam);
router.put('/:id', auth, teacherAuth, examController.updateExam);
router.delete('/:id', auth, teacherAuth, examController.deleteExam);

// Student submit exam answers
router.post('/:id/submit', auth, studentAuth, examController.submitExam);

module.exports = router;
