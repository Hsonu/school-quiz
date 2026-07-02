const bcrypt = require('bcryptjs');
const Principal = require('../models/Principal');
const College = require('../models/College');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Teacher = require('../models/Teacher');
const Student = require('../models/Student');
const TeacherSubject = require('../models/TeacherSubject');
const Timetable = require('../models/Timetable');
const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const Result = require('../models/Result');
const Attendance = require('../models/Attendance');
const generateToken = require('../utils/jwtToken');
const sendResponse = require('../utils/response');
const { validateEmail, validatePassword } = require('../utils/validator');

// 1. Principal Login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendResponse(res, 400, false, 'Please provide email and password.');
    }

    const principal = await Principal.findOne({ email });
    if (!principal) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, principal.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    if (principal.isActive === false) {
      return sendResponse(res, 403, false, 'Your account has been deactivated.');
    }

    const token = generateToken(principal._id, 'principal');

    return sendResponse(res, 200, true, 'Logged in successfully.', {
      token,
      principal: {
        id: principal._id,
        name: principal.name,
        email: principal.email,
        role: 'principal'
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Dashboard Statistics
exports.getDashboardStats = async (req, res, next) => {
  try {
    const deptCount = await Department.countDocuments({});
    const courseCount = await Course.countDocuments({});
    const semesterCount = await Semester.countDocuments({});
    const subjectCount = await Subject.countDocuments({});
    const teacherCount = await Teacher.countDocuments({});
    const studentCount = await Student.countDocuments({});
    const pendingExamsCount = await Exam.countDocuments({ isApproved: false });

    // Latest results / activities
    const results = await Result.find({});
    const sortedResults = [...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    const recentActivity = [];

    for (const r of sortedResults) {
      const student = await Student.findById(r.studentId);
      let title = 'Assessment';
      if (r.type === 'exam' && r.examId) {
        const exam = await Exam.findById(r.examId);
        if (exam) title = exam.title;
      } else if (r.quizId) {
        const quiz = await Quiz.findById(r.quizId);
        if (quiz) title = quiz.title;
      }
      recentActivity.push({
        studentName: student ? student.name : 'Unknown Student',
        assessmentTitle: title,
        percentage: r.percentage,
        status: r.status,
        date: r.createdAt
      });
    }

    return sendResponse(res, 200, true, 'Dashboard stats loaded.', {
      deptCount,
      courseCount,
      semesterCount,
      subjectCount,
      teacherCount,
      studentCount,
      pendingExamsCount,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

// 3. Department CRUD
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({});
    return sendResponse(res, 200, true, 'Departments fetched.', departments);
  } catch (error) {
    next(error);
  }
};

exports.addDepartment = async (req, res, next) => {
  try {
    const { name, collegeId } = req.body;
    if (!name) return sendResponse(res, 400, false, 'Department name is required.');

    const dept = await Department.create({ name, collegeId: collegeId || '' });
    return sendResponse(res, 201, true, 'Department created successfully.', dept);
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, collegeId } = req.body;

    const dept = await Department.findByIdAndUpdate(id, { name, collegeId }, { new: true });
    return sendResponse(res, 200, true, 'Department updated successfully.', dept);
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Department.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Department deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 4. Course CRUD
exports.getCourses = async (req, res, next) => {
  try {
    const courses = await Course.find({});
    const populated = [];
    for (const c of courses) {
      const dept = await Department.findById(c.departmentId);
      populated.push({
        id: c._id,
        name: c.name,
        departmentId: c.departmentId,
        departmentName: dept ? dept.name : 'N/A',
        durationYears: c.durationYears
      });
    }
    return sendResponse(res, 200, true, 'Courses fetched.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addCourse = async (req, res, next) => {
  try {
    const { name, departmentId, durationYears } = req.body;
    if (!name || !departmentId) {
      return sendResponse(res, 400, false, 'Name and departmentId are required.');
    }
    const course = await Course.create({ name, departmentId, durationYears: durationYears || 3 });
    return sendResponse(res, 201, true, 'Course created successfully.', course);
  } catch (error) {
    next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, departmentId, durationYears } = req.body;
    const course = await Course.findByIdAndUpdate(id, { name, departmentId, durationYears }, { new: true });
    return sendResponse(res, 200, true, 'Course updated successfully.', course);
  } catch (error) {
    next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Course.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Course deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 5. Semester CRUD
exports.getSemesters = async (req, res, next) => {
  try {
    const semesters = await Semester.find({});
    const populated = [];
    for (const s of semesters) {
      const course = await Course.findById(s.courseId);
      populated.push({
        id: s._id,
        name: s.name,
        courseId: s.courseId,
        courseName: course ? course.name : 'N/A'
      });
    }
    return sendResponse(res, 200, true, 'Semesters fetched.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addSemester = async (req, res, next) => {
  try {
    const { name, courseId } = req.body;
    if (!name || !courseId) return sendResponse(res, 400, false, 'Name and courseId are required.');

    const sem = await Semester.create({ name, courseId });
    return sendResponse(res, 201, true, 'Semester created successfully.', sem);
  } catch (error) {
    next(error);
  }
};

exports.updateSemester = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, courseId } = req.body;
    const sem = await Semester.findByIdAndUpdate(id, { name, courseId }, { new: true });
    return sendResponse(res, 200, true, 'Semester updated successfully.', sem);
  } catch (error) {
    next(error);
  }
};

exports.deleteSemester = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Semester.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Semester deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 6. Subject CRUD
exports.getSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({});

    // Batch fetch referenced models
    const deptIds = [...new Set(subjects.map(s => s.departmentId).filter(Boolean))];
    const courseIds = [...new Set(subjects.map(s => s.courseId).filter(Boolean))];
    const semIds = [...new Set(subjects.map(s => s.semesterId).filter(Boolean))];

    const [depts, courses, sems] = await Promise.all([
      Department.find({ _id: { $in: deptIds } }),
      Course.find({ _id: { $in: courseIds } }),
      Semester.find({ _id: { $in: semIds } })
    ]);

    const deptsMap = new Map(depts.map(d => [String(d._id), d]));
    const coursesMap = new Map(courses.map(c => [String(c._id), c]));
    const semsMap = new Map(sems.map(sem => [String(sem._id), sem]));

    const populated = [];
    for (const s of subjects) {
      const dept = deptsMap.get(String(s.departmentId));
      const course = coursesMap.get(String(s.courseId));
      const sem = semsMap.get(String(s.semesterId));

      populated.push({
        id: s._id,
        name: s.name,
        departmentId: s.departmentId || '',
        departmentName: dept ? dept.name : 'N/A',
        courseId: s.courseId || '',
        courseName: course ? course.name : 'N/A',
        semesterId: s.semesterId || '',
        semesterName: sem ? sem.name : 'N/A'
      });
    }

    let resultData = populated;

    // Apply Filters
    if (req.query.search) {
      const searchLower = String(req.query.search).toLowerCase();
      resultData = resultData.filter(item => String(item.name).toLowerCase().includes(searchLower));
    }
    if (req.query.departmentId) {
      resultData = resultData.filter(item => String(item.departmentId) === String(req.query.departmentId));
    }
    if (req.query.courseId) {
      resultData = resultData.filter(item => String(item.courseId) === String(req.query.courseId));
    }
    if (req.query.semesterId) {
      resultData = resultData.filter(item => String(item.semesterId) === String(req.query.semesterId));
    }

    // Apply Sorting
    const sortBy = req.query.sortBy || 'name';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    resultData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();

      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return sendResponse(res, 200, true, 'Subjects fetched.', resultData);
  } catch (error) {
    next(error);
  }
};

exports.addSubject = async (req, res, next) => {
  try {
    const { name, departmentId, courseId, semesterId } = req.body;
    if (!name) return sendResponse(res, 400, false, 'Name is required.');

    const subject = await Subject.create({ name, departmentId, courseId, semesterId });
    return sendResponse(res, 201, true, 'Subject created successfully.', subject);
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, departmentId, courseId, semesterId } = req.body;

    const subject = await Subject.findByIdAndUpdate(id, { name, departmentId, courseId, semesterId }, { new: true });
    return sendResponse(res, 200, true, 'Subject updated successfully.', subject);
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Subject.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Subject deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 7. Teacher CRUD & Assignments
exports.getTeachers = async (req, res, next) => {
  try {
    const teachers = await Teacher.find({});
    const populated = [];
    for (const t of teachers) {
      const dept = await Department.findById(t.departmentId);

      // Get assigned subjects
      const tSubjects = await TeacherSubject.find({ teacherId: t._id });
      const subjects = [];
      for (const ts of tSubjects) {
        const sub = await Subject.findById(ts.subjectId);
        if (sub) {
          subjects.push({ id: sub._id, name: sub.name });
        }
      }

      populated.push({
        id: t._id,
        name: t.name,
        email: t.email,
        designation: t.designation,
        departmentId: t.departmentId || '',
        departmentName: dept ? dept.name : 'N/A',
        isActive: t.isActive !== false,
        subjects
      });
    }
    return sendResponse(res, 200, true, 'Teachers list loaded.', populated);
  } catch (error) {
    next(error);
  }
};

exports.updateTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, designation, departmentId, isActive } = req.body;

    const teacher = await Teacher.findById(id);
    if (!teacher) return sendResponse(res, 404, false, 'Teacher not found.');

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (designation) updateData.designation = designation;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    await Teacher.findByIdAndUpdate(id, updateData);
    return sendResponse(res, 200, true, 'Teacher updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deleteTeacher = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Teacher.findByIdAndDelete(id);
    await TeacherSubject.deleteMany({ teacherId: id });
    return sendResponse(res, 200, true, 'Teacher deleted successfully.');
  } catch (error) {
    next(error);
  }
};

exports.assignSubjects = async (req, res, next) => {
  try {
    const { teacherId, subjectIds } = req.body;
    if (!teacherId || !Array.isArray(subjectIds)) {
      return sendResponse(res, 400, false, 'teacherId and subjectIds (array) are required.');
    }

    // Drop previous mappings
    await TeacherSubject.deleteMany({ teacherId });

    // Add new ones
    for (const sid of subjectIds) {
      await TeacherSubject.create({ teacherId, subjectId: sid });
    }

    return sendResponse(res, 200, true, 'Subjects assigned to teacher successfully.');
  } catch (error) {
    next(error);
  }
};

// 8. Student CRUD
exports.getStudents = async (req, res, next) => {
  try {
    const students = await Student.find({});
    const populated = [];
    for (const s of students) {
      const dept = await Department.findById(s.departmentId);
      const course = await Course.findById(s.courseId);
      const sem = await Semester.findById(s.semesterId);

      populated.push({
        id: s._id,
        name: s.name,
        email: s.email,
        rollNo: s.rollNo,
        departmentId: s.departmentId || '',
        departmentName: dept ? dept.name : 'N/A',
        courseId: s.courseId || '',
        courseName: course ? course.name : 'N/A',
        semesterId: s.semesterId || '',
        semesterName: sem ? sem.name : 'N/A',
        isActive: s.isActive !== false
      });
    }
    return sendResponse(res, 200, true, 'Students list loaded.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addStudent = async (req, res, next) => {
  try {
    const { name, email, password, rollNo, departmentId, courseId, semesterId } = req.body;
    if (!name || !email || !password || !rollNo) {
      return sendResponse(res, 400, false, 'Name, email, password, and roll number are required.');
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
      rollNo,
      departmentId: departmentId || '',
      courseId: courseId || '',
      semesterId: semesterId || '',
      isActive: true
    });

    return sendResponse(res, 201, true, 'Student created successfully.', { id: student._id });
  } catch (error) {
    next(error);
  }
};

exports.updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, rollNo, departmentId, courseId, semesterId, isActive } = req.body;

    const student = await Student.findById(id);
    if (!student) return sendResponse(res, 404, false, 'Student not found.');

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (rollNo) updateData.rollNo = rollNo;
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (semesterId !== undefined) updateData.semesterId = semesterId;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    await Student.findByIdAndUpdate(id, updateData);
    return sendResponse(res, 200, true, 'Student details updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    await Attendance.deleteMany({ studentId: id });
    await Result.deleteMany({ studentId: id });
    return sendResponse(res, 200, true, 'Student deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 9. Timetable CRUD
exports.getTimetables = async (req, res, next) => {
  try {
    const entries = await Timetable.find({});
    const populated = [];
    for (const e of entries) {
      const sub = await Subject.findById(e.subjectId);
      const teacher = await Teacher.findById(e.teacherId);
      const sem = await Semester.findById(e.semesterId);

      populated.push({
        id: e._id,
        subjectId: e.subjectId,
        subjectName: sub ? sub.name : 'N/A',
        teacherId: e.teacherId,
        teacherName: teacher ? teacher.name : 'N/A',
        day: e.day,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room,
        semesterId: e.semesterId || '',
        semesterName: sem ? sem.name : 'N/A'
      });
    }
    return sendResponse(res, 200, true, 'Timetables loaded.', populated);
  } catch (error) {
    next(error);
  }
};

exports.addTimetable = async (req, res, next) => {
  try {
    const { subjectId, teacherId, day, startTime, endTime, room, semesterId } = req.body;
    if (!subjectId || !teacherId || !day || !startTime || !endTime) {
      return sendResponse(res, 400, false, 'Subject, Teacher, Day, Start and End times are required.');
    }

    const entry = await Timetable.create({
      subjectId, teacherId, day, startTime, endTime, room: room || '', semesterId: semesterId || ''
    });
    return sendResponse(res, 201, true, 'Timetable entry added successfully.', entry);
  } catch (error) {
    next(error);
  }
};

exports.updateTimetable = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subjectId, teacherId, day, startTime, endTime, room, semesterId } = req.body;
    const entry = await Timetable.findByIdAndUpdate(id, {
      subjectId, teacherId, day, startTime, endTime, room, semesterId
    }, { new: true });
    return sendResponse(res, 200, true, 'Timetable updated successfully.', entry);
  } catch (error) {
    next(error);
  }
};

exports.deleteTimetable = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Timetable.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Timetable entry deleted successfully.');
  } catch (error) {
    next(error);
  }
};

// 10. Approve Exams
exports.getPendingExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ isApproved: false });
    const populated = [];
    for (const ex of exams) {
      const sub = await Subject.findById(ex.subjectId);
      const teacher = await Teacher.findById(ex.teacherId);

      let courseName = 'N/A';
      let semesterName = 'N/A';
      if (sub) {
        const course = await Course.findById(sub.courseId);
        const sem = await Semester.findById(sub.semesterId);
        if (course) courseName = course.name;
        if (sem) semesterName = sem.name;
      }

      const questionsData = [];
      if (ex.questions && Array.isArray(ex.questions)) {
        for (const qId of ex.questions) {
          const q = await Question.findById(qId);
          if (q) {
            questionsData.push({
              id: q._id,
              questionText: q.questionText,
              options: q.options,
              correctAnswer: q.correctAnswer,
              points: q.points
            });
          }
        }
      }

      populated.push({
        id: ex._id,
        title: ex.title,
        description: ex.description,
        subjectName: sub ? sub.name : 'N/A',
        courseName,
        semesterName,
        teacherName: teacher ? teacher.name : 'N/A',
        duration: ex.duration,
        totalMarks: ex.totalMarks,
        examDate: ex.examDate,
        questions: questionsData
      });
    }
    return sendResponse(res, 200, true, 'Pending exams fetched.', populated);
  } catch (error) {
    next(error);
  }
};

exports.approveExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Exam.findByIdAndUpdate(id, { isApproved: true });
    return sendResponse(res, 200, true, 'Exam approved successfully.');
  } catch (error) {
    next(error);
  }
};

exports.rejectExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Reject by deleting or disabling the exam. Let's delete it.
    await Exam.findByIdAndDelete(id);
    return sendResponse(res, 200, true, 'Exam rejected and deleted.');
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const principal = await Principal.findById(req.user.id);
    if (!principal) {
      return sendResponse(res, 404, false, 'Principal not found.');
    }

    const profile = {
      id: principal._id,
      name: principal.name,
      email: principal.email,
      designation: principal.designation || 'Principal',
      profilePic: principal.profilePic || ''
    };

    return sendResponse(res, 200, true, 'Profile fetched successfully.', profile);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, designation, password } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (designation) updateData.designation = designation;

    if (password) {
      if (!validatePassword(password)) {
        return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      updateData.profilePic = `/uploads/${req.file.filename}`;
    }

    const updated = await Principal.findByIdAndUpdate(req.user.id, updateData, { new: true });

    return sendResponse(res, 200, true, 'Profile updated successfully.', {
      id: updated._id,
      name: updated.name,
      email: updated.email,
      designation: updated.designation || 'Principal',
      profilePic: updated.profilePic || ''
    });
  } catch (error) {
    next(error);
  }
};
