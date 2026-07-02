const bcrypt = require('bcryptjs');
const Owner = require('../models/Owner');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Quiz = require('../models/Quiz');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Attendance = require('../models/Attendance');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const Principal = require('../models/Principal');
const College = require('../models/College');
const generateToken = require('../utils/jwtToken');
const { validateEmail, validatePassword } = require('../utils/validator');
const sendResponse = require('../utils/response');

// 1. Owner Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendResponse(res, 400, false, 'Please provide email and password.');
    }

    const owner = await Owner.findOne({ email });
    if (!owner) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, owner.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    const token = generateToken(owner._id, 'owner');

    return sendResponse(res, 200, true, 'Logged in successfully.', {
      token,
      owner: {
        id: owner._id,
        name: owner.name,
        email: owner.email,
        role: 'owner'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Owner Dashboard Stats
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalStudents = await Student.countDocuments({});
    const totalTeachers = await Teacher.countDocuments({});
    const totalExams = await Exam.countDocuments({});
    const totalQuizzes = await Quiz.countDocuments({});

    const activeTeachers = await Teacher.countDocuments({ isActive: true });
    const activeStudents = await Student.countDocuments({ isActive: true });

    // Today's starts/ends bounds
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Today's exams
    const exams = await Exam.find({});
    const todayExams = exams.filter(e => {
      const d = new Date(e.examDate);
      return d >= startOfToday && d <= endOfToday;
    }).length;

    // Today's quizzes (created today)
    const quizzes = await Quiz.find({});
    const todayQuizzes = quizzes.filter(q => {
      const d = new Date(q.createdAt);
      return d >= startOfToday && d <= endOfToday;
    }).length;

    // Attendance %
    const attendanceRecords = await Attendance.find({});
    let attendancePercentage = 100;
    if (attendanceRecords.length > 0) {
      const presentCount = attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
      attendancePercentage = Math.round((presentCount / attendanceRecords.length) * 100);
    }

    // Results metrics
    const results = await Result.find({});
    let passPercentage = 0;
    let failPercentage = 0;
    if (results.length > 0) {
      const passes = results.filter(r => r.status === 'Pass').length;
      passPercentage = Math.round((passes / results.length) * 100);
      failPercentage = 100 - passPercentage;
    }

    // Recent activities (Latest 6 results or entries)
    const recentActivities = [];
    const sortedResults = [...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    for (const r of sortedResults) {
      const student = await Student.findById(r.studentId);
      let assessmentTitle = 'Assessment';
      if (r.type === 'exam' && r.examId) {
        const exam = await Exam.findById(r.examId);
        if (exam) assessmentTitle = `Exam: ${exam.title}`;
      } else if (r.quizId) {
        const quiz = await Quiz.findById(r.quizId);
        if (quiz) assessmentTitle = `Quiz: ${quiz.title}`;
      }
      recentActivities.push({
        type: 'result',
        message: `${student ? student.name : 'A student'} scored ${r.percentage}% on ${assessmentTitle}`,
        time: r.createdAt
      });
    }

    // Add some teacher signup / additions in activities
    const latestTeachers = await Teacher.find({});
    latestTeachers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach(t => {
      recentActivities.push({
        type: 'teacher',
        message: `Teacher ${t.name} was added to the ERP system.`,
        time: t.createdAt
      });
    });

    recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Performance trends over months
    const monthlyPerformanceGraph = [
      { month: 'Jan', averageScore: 68 },
      { month: 'Feb', averageScore: 72 },
      { month: 'Mar', averageScore: 75 },
      { month: 'Apr', averageScore: 70 },
      { month: 'May', averageScore: 79 },
      { month: 'Jun', averageScore: 84 }
    ];

    // Attendance trends
    const attendanceChart = [
      { day: 'Mon', percentage: 92 },
      { day: 'Tue', percentage: 94 },
      { day: 'Wed', percentage: 95 },
      { day: 'Thu', percentage: 93 },
      { day: 'Fri', percentage: 90 }
    ];

    // Student Growth trends
    const studentGrowthChart = [
      { month: 'Jan', students: 100 },
      { month: 'Feb', students: 120 },
      { month: 'Mar', students: 150 },
      { month: 'Apr', students: 165 },
      { month: 'May', students: 180 },
      { month: 'Jun', students: 200 }
    ];

    return sendResponse(res, 200, true, 'Owner stats loaded.', {
      totalStudents,
      totalTeachers,
      totalExams,
      totalQuizzes,
      activeTeachers,
      activeStudents,
      todayExams,
      todayQuizzes,
      attendancePercentage,
      passPercentage,
      failPercentage,
      recentActivities: recentActivities.slice(0, 8),
      charts: {
        monthlyPerformance: monthlyPerformanceGraph,
        attendanceTrend: attendanceChart,
        studentGrowth: studentGrowthChart
      }
    });
  } catch (error) {
    next(error);
  }
};

// 3. Teachers CRUD
exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await Teacher.find({});
    // Populate subjects and classes details
    const populated = [];
    for (const t of teachers) {
      const classes = await Class.find({ teacherId: t._id });
      const subjects = await Subject.find({ teacherId: t._id });

      populated.push({
        id: t._id,
        name: t.name,
        email: t.email,
        designation: t.designation,
        profilePic: t.profilePic,
        isActive: t.isActive !== false,
        classes: classes.map(c => ({ id: c._id, name: c.name })),
        subjects: subjects.map(s => ({ id: s._id, name: s.name }))
      });
    }
    return sendResponse(res, 200, true, 'Teachers fetched.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addTeacher = async (req, res, next) => {
  try {
    const { name, email, password, designation, classIds, subjectIds } = req.body;

    if (!name || !email || !password) {
      return sendResponse(res, 400, false, 'Name, email, and password are required.');
    }

    if (!validateEmail(email)) {
      return sendResponse(res, 400, false, 'Invalid email address.');
    }

    if (!validatePassword(password)) {
      return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
    }

    const existing = await Teacher.findOne({ email });
    if (existing) {
      return sendResponse(res, 400, false, 'Email is already registered as a Teacher.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const teacher = await Teacher.create({
      name,
      email,
      password: hashedPassword,
      designation: designation || 'Instructor',
      isActive: true,
      profilePic: ''
    });

    // Assign classes
    if (classIds && Array.isArray(classIds)) {
      for (const cid of classIds) {
        await Class.findByIdAndUpdate(cid, { teacherId: teacher._id });
      }
    }

    // Assign subjects
    if (subjectIds && Array.isArray(subjectIds)) {
      for (const sid of subjectIds) {
        await Subject.findByIdAndUpdate(sid, { teacherId: teacher._id });
      }
    }

    return sendResponse(res, 201, true, 'Teacher created successfully.', { id: teacher._id });
  } catch (error) {
    next(error);
  }
};

exports.updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, designation, isActive, classIds, subjectIds } = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found.');
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (designation) updateData.designation = designation;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    await Teacher.findByIdAndUpdate(id, updateData);

    // Reset old class associations for this teacher and apply new ones
    if (classIds && Array.isArray(classIds)) {
      const oldClasses = await Class.find({ teacherId: id });
      for (const o of oldClasses) {
        await Class.findByIdAndUpdate(o._id, { teacherId: 'admin' }); // default fallback
      }
      for (const cid of classIds) {
        await Class.findByIdAndUpdate(cid, { teacherId: id });
      }
    }

    // Reset old subject associations and apply new ones
    if (subjectIds && Array.isArray(subjectIds)) {
      const oldSubjects = await Subject.find({ teacherId: id });
      for (const o of oldSubjects) {
        await Subject.findByIdAndUpdate(o._id, { teacherId: 'admin' });
      }
      for (const sid of subjectIds) {
        await Subject.findByIdAndUpdate(sid, { teacherId: id });
      }
    }

    return sendResponse(res, 200, true, 'Teacher updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.resetTeacherPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || !validatePassword(newPassword)) {
      return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Teacher.findByIdAndUpdate(id, { password: hashedPassword });
    return sendResponse(res, 200, true, 'Password reset successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Teacher.findByIdAndDelete(id);

    // Clear class and subject associations
    const classes = await Class.find({ teacherId: id });
    for (const c of classes) {
      await Class.findByIdAndUpdate(c._id, { teacherId: 'admin' });
    }
    const subjects = await Subject.find({ teacherId: id });
    for (const s of subjects) {
      await Subject.findByIdAndUpdate(s._id, { teacherId: 'admin' });
    }

    return sendResponse(res, 200, true, 'Teacher deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 4. Students CRUD
exports.getStudents = async (req, res, next) => {
  try {
    const students = await Student.find({});
    const populated = [];
    for (const s of students) {
      const cls = await Class.findById(s.classId);
      populated.push({
        id: s._id,
        name: s.name,
        email: s.email,
        rollNo: s.rollNo,
        isActive: s.isActive !== false,
        classId: s.classId,
        className: cls ? cls.name : 'N/A'
      });
    }
    return sendResponse(res, 200, true, 'Students fetched.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addStudent = async (req, res, next) => {
  try {
    const { name, email, password, classId, rollNo } = req.body;
    if (!name || !email || !password || !classId || !rollNo) {
      return sendResponse(res, 400, false, 'All fields are required.');
    }

    const existing = await Student.findOne({ email });
    if (existing) {
      return sendResponse(res, 400, false, 'Email is already registered.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
      classId,
      rollNo,
      isActive: true,
      profilePic: ''
    });

    return sendResponse(res, 201, true, 'Student created successfully.', { id: student._id });
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, classId, rollNo, isActive } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (classId) updateData.classId = classId;
    if (rollNo) updateData.rollNo = rollNo;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    await Student.findByIdAndUpdate(id, updateData);
    return sendResponse(res, 200, true, 'Student updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    // Remove attendance & results
    await Attendance.deleteMany({ studentId: id });
    await Result.deleteMany({ studentId: id });

    return sendResponse(res, 200, true, 'Student deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// Student Results & Attendance
exports.getStudentProfileData = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await Student.findById(id);
    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    const cls = await Class.findById(student.classId);
    const results = await Result.find({ studentId: id });
    const attendance = await Attendance.find({ studentId: id });

    // Format results details
    const formattedResults = [];
    for (const r of results) {
      let title = 'Deleted Assessment';
      if (r.type === 'exam' && r.examId) {
        const ex = await Exam.findById(r.examId);
        if (ex) title = ex.title;
      } else if (r.quizId) {
        const qz = await Quiz.findById(r.quizId);
        if (qz) title = qz.title;
      }

      formattedResults.push({
        id: r._id,
        assessmentTitle: title,
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        status: r.status,
        date: r.createdAt
      });
    }

    return sendResponse(res, 200, true, 'Student profile metrics loaded.', {
      profile: {
        id: student._id,
        name: student.name,
        email: student.email,
        rollNo: student.rollNo,
        className: cls ? cls.name : 'N/A',
        isActive: student.isActive !== false
      },
      results: formattedResults,
      attendance: attendance.map(a => ({
        date: a.date,
        status: a.status
      }))
    });
  } catch (error) {
    next(error);
  }
};

// 5. Classes & Subjects
exports.getAllClasses = async (req, res, next) => {
  try {
    const classes = await Class.find({});
    const result = [];
    for (const c of classes) {
      const teacher = await Teacher.findById(c.teacherId);
      result.push({
        id: c._id,
        name: c.name,
        teacherId: c.teacherId,
        teacherName: teacher ? teacher.name : 'Unassigned/Admin'
      });
    }
    return sendResponse(res, 200, true, 'Classes loaded.', result);
  } catch (error) {
    next(error);
  }
};

exports.getAllSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({});
    const result = [];
    for (const s of subjects) {
      const cls = await Class.findById(s.classId);
      const teacher = await Teacher.findById(s.teacherId);
      result.push({
        id: s._id,
        name: s.name,
        classId: s.classId,
        className: cls ? cls.name : 'N/A',
        teacherId: s.teacherId,
        teacherName: teacher ? teacher.name : 'Unassigned/Admin'
      });
    }
    return sendResponse(res, 200, true, 'Subjects loaded.', result);
  } catch (error) {
    next(error);
  }
};

// 6. Attendance Logging
exports.logAttendance = async (req, res, next) => {
  try {
    const { classId, date, records } = req.body; // records: [{studentId, status}]
    if (!classId || !date || !records || !Array.isArray(records)) {
      return sendResponse(res, 400, false, 'Invalid attendance submit body.');
    }

    const logDate = new Date(date);
    logDate.setHours(12, 0, 0, 0); // normalize date

    for (const rec of records) {
      // Check if attendance already logged for student on this day
      const existing = await Attendance.findOne({
        studentId: rec.studentId,
        classId,
        date: logDate
      });

      if (existing) {
        await Attendance.findByIdAndUpdate(existing._id, { status: rec.status });
      } else {
        await Attendance.create({
          studentId: rec.studentId,
          classId,
          date: logDate,
          status: rec.status
        });
      }
    }

    return sendResponse(res, 200, true, 'Attendance logged successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getAttendanceLogs = async (req, res, next) => {
  try {
    const logs = await Attendance.find({});
    const result = [];
    for (const l of logs) {
      const student = await Student.findById(l.studentId);
      const cls = await Class.findById(l.classId);
      result.push({
        id: l._id,
        studentName: student ? student.name : 'Unknown Student',
        rollNo: student ? student.rollNo : 'N/A',
        className: cls ? cls.name : 'N/A',
        date: l.date,
        status: l.status
      });
    }
    return sendResponse(res, 200, true, 'Attendance logs fetched.', result);
  } catch (error) {
    next(error);
  }
};

// 7. Advanced Report Generation
exports.generateReport = async (req, res, next) => {
  try {
    const {
      startDate, endDate, studentName, teacherName, classId, subjectId,
      quizId, examId, attendanceStatus, resultStatus, marksMin, marksMax,
      createdBy, type
    } = req.query;

    let dataset = [];

    if (type === 'attendance') {
      const attendances = await Attendance.find({});
      for (const a of attendances) {
        const student = await Student.findById(a.studentId);
        const cls = await Class.findById(a.classId);

        if (classId && String(a.classId) !== String(classId)) continue;
        if (attendanceStatus && a.status !== attendanceStatus) continue;
        if (studentName && student && !student.name.toLowerCase().includes(studentName.toLowerCase())) continue;
        if (startDate && new Date(a.date) < new Date(startDate)) continue;
        if (endDate && new Date(a.date) > new Date(endDate)) continue;

        dataset.push({
          id: a._id,
          type: 'Attendance',
          studentName: student ? student.name : 'Unknown',
          rollNo: student ? student.rollNo : 'N/A',
          className: cls ? cls.name : 'N/A',
          subject: 'N/A',
          assessment: 'Daily Log',
          status: a.status,
          score: '-',
          percentage: '-',
          date: new Date(a.date).toLocaleDateString(),
          rawDate: a.date
        });
      }
    } else {
      // Results report (Quiz & Exams)
      const results = await Result.find({});
      for (const r of results) {
        const student = await Student.findById(r.studentId);
        if (!student) continue;

        const cls = await Class.findById(student.classId);
        let teacher = null;
        let subject = null;
        let assessmentName = 'Assessment';
        let examObj = null;

        if (r.type === 'exam' && r.examId) {
          const ex = await Exam.findById(r.examId);
          if (ex) {
            examObj = ex;
            assessmentName = ex.title;
            subject = await Subject.findById(ex.subjectId);
            teacher = await Teacher.findById(ex.teacherId);
          }
        } else if (r.quizId) {
          const qz = await Quiz.findById(r.quizId);
          if (qz) {
            assessmentName = qz.title;
            subject = await Subject.findById(qz.subjectId);
            teacher = await Teacher.findById(qz.teacherId);
          }
        }

        // Apply filters
        if (type && r.type !== type) continue;
        if (classId && String(student.classId) !== String(classId)) continue;
        if (subjectId && subject && String(subject._id) !== String(subjectId)) continue;
        if (quizId && String(r.quizId) !== String(quizId)) continue;
        if (examId && String(r.examId) !== String(examId)) continue;
        if (resultStatus && r.status !== resultStatus) continue;
        if (studentName && !student.name.toLowerCase().includes(studentName.toLowerCase())) continue;
        if (teacherName && teacher && !teacher.name.toLowerCase().includes(teacherName.toLowerCase())) continue;
        if (createdBy && teacher && String(teacher._id) !== String(createdBy)) continue;

        if (marksMin && r.score < Number(marksMin)) continue;
        if (marksMax && r.score > Number(marksMax)) continue;

        if (startDate && new Date(r.createdAt) < new Date(startDate)) continue;
        if (endDate && new Date(r.createdAt) > new Date(endDate)) continue;

        dataset.push({
          id: r._id,
          type: r.type === 'exam' ? 'Exam' : 'Quiz',
          studentName: student.name,
          rollNo: student.rollNo,
          className: cls ? cls.name : 'N/A',
          subject: subject ? subject.name : 'N/A',
          assessment: assessmentName,
          status: r.status,
          score: `${r.score} / ${r.totalMarks}`,
          totalMarks: r.totalMarks,
          marksObtained: r.score,
          passMarks: examObj ? (examObj.passMarks !== undefined ? examObj.passMarks : 40) : 40,
          percentage: `${r.percentage}%`,
          date: new Date(r.createdAt).toLocaleDateString(),
          rawDate: r.createdAt
        });
      }
    }

    // Sort by date desc
    dataset.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

    return sendResponse(res, 200, true, 'Report generated.', dataset);
  } catch (error) {
    next(error);
  }
};

// 8. Principal CRUD
exports.getPrincipals = async (req, res, next) => {
  try {
    const principals = await Principal.find({});
    const populated = [];
    for (const p of principals) {
      let collegeName = 'N/A';
      if (p.collegeId) {
        const col = await College.findById(p.collegeId);
        if (col) collegeName = col.name;
      }
      populated.push({
        id: p._id,
        name: p.name,
        email: p.email,
        collegeId: p.collegeId || '',
        collegeName,
        isActive: p.isActive !== false
      });
    }
    return sendResponse(res, 200, true, 'Principals fetched.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addPrincipal = async (req, res, next) => {
  try {
    const { name, email, password, collegeId } = req.body;
    if (!name || !email || !password) {
      return sendResponse(res, 400, false, 'Name, email, and password are required.');
    }
    if (!validateEmail(email)) {
      return sendResponse(res, 400, false, 'Invalid email address.');
    }
    if (!validatePassword(password)) {
      return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
    }

    const existing = await Principal.findOne({ email });
    if (existing) {
      return sendResponse(res, 400, false, 'Email is already registered.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const principal = await Principal.create({
      name,
      email,
      password: hashedPassword,
      collegeId: collegeId || '',
      isActive: true,
      role: 'principal'
    });

    return sendResponse(res, 201, true, 'Principal created successfully.', { id: principal._id });
  } catch (error) {
    next(error);
  }
};

exports.updatePrincipal = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, collegeId, isActive } = req.body;

    const principal = await Principal.findById(id);
    if (!principal) {
      return sendResponse(res, 404, false, 'Principal not found.');
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (collegeId !== undefined) updateData.collegeId = collegeId;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    await Principal.findByIdAndUpdate(id, updateData);
    return sendResponse(res, 200, true, 'Principal updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deletePrincipal = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Principal.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Principal deleted successfully.');
  } catch (error) {
    next(error);
  }
};

exports.resetPrincipalPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || !validatePassword(newPassword)) {
      return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await Principal.findByIdAndUpdate(id, { password: hashedPassword });
    return sendResponse(res, 200, true, 'Password reset successfully.');
  } catch (error) {
    next(error);
  }
};

// 9. College & Settings CRUD
exports.getColleges = async (req, res, next) => {
  try {
    const colleges = await College.find({});
    return sendResponse(res, 200, true, 'Colleges fetched.', colleges);
  } catch (error) {
    next(error);
  }
};

exports.addCollege = async (req, res, next) => {
  try {
    const { name, code, address } = req.body;
    if (!name || !code) {
      return sendResponse(res, 400, false, 'Name and code are required.');
    }

    const existing = await College.findOne({ code });
    if (existing) {
      return sendResponse(res, 400, false, 'College code already exists.');
    }

    const college = await College.create({ name, code, address: address || '' });
    return sendResponse(res, 201, true, 'College created successfully.', college);
  } catch (error) {
    next(error);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    // Return current settings. For simplicity, we get college settings or system defaults.
    const colleges = await College.find({});
    const college = colleges[0] || { settings: {} };
    return sendResponse(res, 200, true, 'Settings fetched.', {
      branding: 'QUIZGEN  ERP',
      collegeName: college.name || 'QUIZGEN  Group',
      collegeCode: college.code || 'RC',
      collegeAddress: college.address || '',
      settings: college.settings || {}
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const { branding, collegeName, collegeCode, collegeAddress, settings } = req.body;
    let colleges = await College.find({});
    let college = colleges[0];

    if (!college) {
      college = await College.create({
        name: collegeName || 'QUIZGEN  Group',
        code: collegeCode || 'RC',
        address: collegeAddress || '',
        settings: settings || {}
      });
    } else {
      const updateData = {};
      if (collegeName) updateData.name = collegeName;
      if (collegeCode) updateData.code = collegeCode;
      if (collegeAddress) updateData.address = collegeAddress;
      if (settings) updateData.settings = settings;
      await College.findByIdAndUpdate(college._id, updateData);
    }

    return sendResponse(res, 200, true, 'Settings updated successfully.');
  } catch (error) {
    next(error);
  }
};

// 10. Backup & Restore
exports.backupDatabase = async (req, res, next) => {
  try {
    const Question = require('../models/Question');
    const Quiz = require('../models/Quiz');
    const QuizAttempt = require('../models/QuizAttempt');
    const ExamAttempt = require('../models/ExamAttempt');

    const models = {
      Owner, Principal, College, Department, Course, Semester,
      Teacher, Student, Class, Subject, TeacherSubject, Timetable,
      Quiz, Exam, Question, Attendance, Marks, Assignment,
      AssignmentSubmission, Notes, Result, Notification, Report,
      QuizAttempt, ExamAttempt
    };

    const backupData = {};
    for (const [name, model] of Object.entries(models)) {
      backupData[name] = await model.find({});
    }

    res.setHeader('Content-disposition', 'attachment; filename=backup_' + Date.now() + '.json');
    res.setHeader('Content-type', 'application/json');
    return res.send(JSON.stringify(backupData, null, 2));
  } catch (error) {
    next(error);
  }
};

exports.restoreDatabase = async (req, res, next) => {
  try {
    if (!req.file) {
      return sendResponse(res, 400, false, 'No backup file uploaded.');
    }

    const fs = require('fs');
    const backupPath = req.file.path;
    const rawData = fs.readFileSync(backupPath, 'utf8');
    const backupData = JSON.parse(rawData);

    const Question = require('../models/Question');
    const Quiz = require('../models/Quiz');
    const QuizAttempt = require('../models/QuizAttempt');
    const ExamAttempt = require('../models/ExamAttempt');

    const models = {
      Owner, Principal, College, Department, Course, Semester,
      Teacher, Student, Class, Subject, TeacherSubject, Timetable,
      Quiz, Exam, Question, Attendance, Marks, Assignment,
      AssignmentSubmission, Notes, Result, Notification, Report,
      QuizAttempt, ExamAttempt
    };

    for (const [name, model] of Object.entries(models)) {
      if (backupData[name]) {
        // Clear old
        await model.deleteMany({});
        // Insert new
        for (const doc of backupData[name]) {
          await model.create(doc);
        }
      }
    }

    // Clean up temp file
    fs.unlinkSync(backupPath);

    return sendResponse(res, 200, true, 'Database restored successfully from backup.');
  } catch (error) {
    next(error);
  }
};

// 11. User Permissions Management
exports.updatePermissions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, role } = req.body;

    // Search and update in Principal, Teacher, or Student
    let user = await Principal.findById(id);
    let Model = Principal;

    if (!user) {
      user = await Teacher.findById(id);
      Model = Teacher;
    }
    if (!user) {
      user = await Student.findById(id);
      Model = Student;
    }

    if (!user) {
      return sendResponse(res, 404, false, 'User not found.');
    }

    const updateData = {};
    if (isActive !== undefined) updateData.isActive = !!isActive;
    if (role) updateData.role = role;

    await Model.findByIdAndUpdate(id, updateData);
    return sendResponse(res, 200, true, 'Permissions updated successfully.');
  } catch (error) {
    next(error);
  }
};
