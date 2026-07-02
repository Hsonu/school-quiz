const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');
const auth = require('../middleware/auth');
const teacherAuth = require('../middleware/teacherAuth');
const studentAuth = require('../middleware/studentAuth');

router.get('/', auth, quizController.getQuizzes);
router.get('/:id', auth, quizController.getQuizDetails);

router.post('/', auth, teacherAuth, quizController.createQuiz);
router.delete('/:id', auth, teacherAuth, quizController.deleteQuiz);

router.post('/:id/submit', auth, studentAuth, quizController.submitQuiz);

module.exports = router;
