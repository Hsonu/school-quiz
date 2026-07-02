const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const auth = require('../middleware/auth');

router.get('/', auth, subjectController.getSubjects);

module.exports = router;
