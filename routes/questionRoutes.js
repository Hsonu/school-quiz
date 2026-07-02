const express = require('express');
const router = express.Router();
const questionController = require('../controllers/questionController');
const auth = require('../middleware/auth');
const teacherAuth = require('../middleware/teacherAuth');

// Query question bank
router.get('/', auth, questionController.getQuestions);

// Edit question bank (Teacher privilege)
router.post('/', auth, teacherAuth, questionController.createQuestion);
router.put('/:id', auth, teacherAuth, questionController.updateQuestion);
router.delete('/:id', auth, teacherAuth, questionController.deleteQuestion);

module.exports = router;
