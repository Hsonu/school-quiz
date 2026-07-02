const express = require('express');
const router = express.Router();
const academicOpsController = require('../controllers/academicOpsController');
const auth = require('../middleware/auth');
const teacherAuth = require('../middleware/teacherAuth');
const studentAuth = require('../middleware/studentAuth');
const docUpload = require('../middleware/docUpload');

// General endpoints
router.get('/my-subjects', auth, academicOpsController.getMyAssignedSubjects);
router.get('/subjects/:subjectId/students', auth, academicOpsController.getSubjectStudents);

// Notes endpoints
router.get('/notes', auth, academicOpsController.getNotes);
router.post('/notes', auth, teacherAuth, docUpload.single('notesFile'), academicOpsController.uploadNotes);
router.delete('/notes/:id', auth, teacherAuth, academicOpsController.deleteNotes);

// Assignments endpoints
router.get('/assignments', auth, academicOpsController.getAssignments);
router.post('/assignments', auth, teacherAuth, docUpload.single('assignmentFile'), academicOpsController.createAssignment);
router.post('/assignments/:id/submit', auth, studentAuth, docUpload.single('submissionFile'), academicOpsController.submitAssignment);
router.get('/assignments/:id/submissions', auth, teacherAuth, academicOpsController.getSubmissions);
router.put('/assignments/submissions/:id/grade', auth, teacherAuth, academicOpsController.gradeSubmission);

// Attendance endpoints
router.post('/attendance', auth, teacherAuth, academicOpsController.takeAttendance);
router.get('/attendance/student', auth, studentAuth, academicOpsController.getStudentAttendance);

// Marks endpoints
router.post('/marks', auth, teacherAuth, academicOpsController.uploadMarks);
router.get('/marks/student', auth, studentAuth, academicOpsController.getStudentMarks);

module.exports = router;
