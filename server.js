require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const compression = require('compression');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Connect Database
connectDB();

// Middlewares
app.use(compression()); // Enable Gzip compression
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache-Control headers configuration for static assets
const staticOptions = {
  maxAge: '1d', // 1 day caching
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      // Don't cache HTML pages to prevent users from seeing stale views
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    } else {
      // Cache CSS, JS, fonts, and images for 1 day
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    }
  }
};

// Serve Static Assets
app.use(express.static(path.join(__dirname, 'public'), staticOptions));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), staticOptions));
app.use('/partials', express.static(path.join(__dirname, 'views', 'partials'), staticOptions));

// API Routes
app.use('/api/teachers', require('./routes/teacherRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/classes', require('./routes/classRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/questions', require('./routes/questionRoutes'));
app.use('/api/quizzes', require('./routes/quizRoutes'));
app.use('/api/results', require('./routes/resultRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/owner', require('./routes/ownerRoutes'));
app.use('/api/principal', require('./routes/principalRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/academic', require('./routes/academicOpsRoutes'));

// Views Routing (HTML pages serving)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/student-signup', (req, res) => res.sendFile(path.join(__dirname, 'views', 'studentSignup.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'views', 'about.html')));

// Owner subviews
app.get('/owner/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'ownerLogin.html')));
app.get('/owner/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'owner', 'dashboard.html')));
app.get('/owner/teachers', (req, res) => res.sendFile(path.join(__dirname, 'views', 'owner', 'teachers.html')));
app.get('/owner/students', (req, res) => res.sendFile(path.join(__dirname, 'views', 'owner', 'students.html')));
app.get('/owner/reports', (req, res) => res.sendFile(path.join(__dirname, 'views', 'owner', 'reports.html')));
app.get('/owner/principals', (req, res) => res.sendFile(path.join(__dirname, 'views', 'owner', 'principals.html')));
app.get('/owner/settings', (req, res) => res.sendFile(path.join(__dirname, 'views', 'owner', 'settings.html')));

// Teacher Subviews
app.get('/teacher/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'dashboard.html')));
app.get('/teacher/addQuestion', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'addQuestion.html')));
app.get('/teacher/manageQuestion', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'manageQuestion.html')));
app.get('/teacher/addQuiz', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'addQuiz.html')));
app.get('/teacher/students', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'students.html')));
app.get('/teacher/results', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'results.html')));
app.get('/teacher/analytics', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'analytics.html')));
app.get('/teacher/profile', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'profile.html')));
app.get('/teacher/settings', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'settings.html')));
app.get('/teacher/notes', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'notes.html')));
app.get('/teacher/assignments', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'assignments.html')));
app.get('/teacher/attendance', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'attendance.html')));
app.get('/teacher/marks', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'marks.html')));
app.get('/teacher/exams', (req, res) => res.sendFile(path.join(__dirname, 'views', 'teacher', 'exams.html')));

// Student Subviews
app.get('/student/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'dashboard.html')));
app.get('/student/selectQuiz', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'selectQuiz.html')));
app.get('/student/quiz', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'quiz.html')));
app.get('/student/result', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'result.html')));
app.get('/student/history', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'history.html')));
app.get('/student/profile', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'profile.html')));
app.get('/student/settings', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'settings.html')));
app.get('/student/subjects', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'subjects.html')));
app.get('/student/notes', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'notes.html')));
app.get('/student/assignments', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'assignments.html')));
app.get('/student/attendance', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'attendance.html')));
app.get('/student/exams', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'exams.html')));
app.get('/student/takeExam', (req, res) => res.sendFile(path.join(__dirname, 'views', 'student', 'takeExam.html')));

// Principal Subviews
app.get('/principal/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'dashboard.html')));
app.get('/principal/departments', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'departments.html')));
app.get('/principal/courses', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'courses.html')));
app.get('/principal/semesters', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'semesters.html')));
app.get('/principal/subjects', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'subjects.html')));
app.get('/principal/classes', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'classes.html')));
app.get('/principal/teachers', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'teachers.html')));
app.get('/principal/students', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'students.html')));
app.get('/principal/timetable', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'timetable.html')));
app.get('/principal/approveExams', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'approveExams.html')));
app.get('/principal/reports', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'reports.html')));
app.get('/principal/settings', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'settings.html')));
app.get('/principal/profile', (req, res) => res.sendFile(path.join(__dirname, 'views', 'principal', 'profile.html')));

// 404 Fallback page
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'views', '404.html'));
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`School ERP Portal running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
