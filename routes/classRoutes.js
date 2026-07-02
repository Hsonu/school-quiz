const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const auth = require('../middleware/auth');

const principalAuth = require('../middleware/principalAuth');

// Retrieve classes (Any logged-in user or guest can check class options)
router.get('/', classController.getClasses);
router.get('/:id', auth, classController.getClassById);

// Manage classes (Principal or Admin privilege required)
router.post('/', auth, principalAuth, classController.createClass);
router.delete('/:id', auth, principalAuth, classController.deleteClass);

module.exports = router;
