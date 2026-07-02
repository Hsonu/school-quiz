const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const auth = require('../middleware/auth');
const teacherAuth = require('../middleware/teacherAuth');
const upload = require('../config/multer');

// Public routes
router.post('/login', teacherController.login);

// Private routes
router.get('/profile', auth, teacherAuth, teacherController.getProfile);
router.put('/profile', auth, teacherAuth, upload.single('profilePic'), teacherController.updateProfile);

module.exports = router;
