const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const auth = require('../middleware/auth');

// Retrieve classes (Any logged-in user or guest can check class options)
router.get('/', classController.getClasses);
router.get('/:id', auth, classController.getClassById);

module.exports = router;
