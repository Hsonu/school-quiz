const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const Class = require('../models/Class');
const generateToken = require('../utils/jwtToken');
const { validateEmail, validatePassword } = require('../utils/validator');
const sendResponse = require('../utils/response');

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password, classId, rollNo } = req.body;

    if (!name || !email || !password || !classId || !rollNo) {
      return sendResponse(res, 400, false, 'Please fill in all required fields.');
    }

    if (!validateEmail(email)) {
      return sendResponse(res, 400, false, 'Please enter a valid email address.');
    }

    if (!validatePassword(password)) {
      return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
    }

    // Verify class exists
    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return sendResponse(res, 404, false, 'Selected Class/Grade does not exist.');
    }

    // Check if student email exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return sendResponse(res, 400, false, 'Email is already registered as a Student.');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Auto-associate default Course, Semester, Department if available
    const Department = require('../models/Department');
    const Course = require('../models/Course');
    const Semester = require('../models/Semester');

    const defaultDept = await Department.findOne({});
    const defaultCourse = await Course.findOne({});
    const defaultSem = await Semester.findOne({});

    const student = await Student.create({
      name,
      email,
      password: hashedPassword,
      classId,
      rollNo,
      departmentId: defaultDept ? String(defaultDept._id) : '',
      courseId: defaultCourse ? String(defaultCourse.id) : '',
      semesterId: defaultSem ? String(defaultSem.id) : '',
      profilePic: ''
    });

    const token = generateToken(student._id, 'student');

    return sendResponse(res, 201, true, 'Student registered successfully.', {
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        classId: student.classId,
        rollNo: student.rollNo
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, 'Please provide email and password.');
    }

    const student = await Student.findOne({ email });
    if (!student) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, student.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    if (student.isActive === false) {
      return sendResponse(res, 403, false, 'Your account has been deactivated. Please contact Nakul Sir.');
    }

    const token = generateToken(student._id, 'student');

    return sendResponse(res, 200, true, 'Logged in successfully.', {
      token,
      student: {
        id: student._id,
        name: student.name,
        email: student.email,
        classId: student.classId,
        rollNo: student.rollNo,
        profilePic: student.profilePic
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    const targetClass = await Class.findById(student.classId);

    const profile = {
      id: student._id,
      name: student.name,
      email: student.email,
      classId: student.classId,
      className: targetClass ? targetClass.name : 'Unknown Class',
      rollNo: student.rollNo,
      profilePic: student.profilePic
    };

    return sendResponse(res, 200, true, 'Profile fetched successfully.', profile);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    
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

    const updatedStudent = await Student.findByIdAndUpdate(req.user.id, updateData, { new: true });
    const targetClass = await Class.findById(updatedStudent.classId);

    return sendResponse(res, 200, true, 'Profile updated successfully.', {
      id: updatedStudent._id,
      name: updatedStudent.name,
      email: updatedStudent.email,
      classId: updatedStudent.classId,
      className: targetClass ? targetClass.name : 'Unknown Class',
      rollNo: updatedStudent.rollNo,
      profilePic: updatedStudent.profilePic
    });
  } catch (error) {
    next(error);
  }
};

// Fetch all students for teacher dashboard lists
exports.getStudentsForTeacher = async (req, res, next) => {
  try {
    const TeacherSubject = require('../models/TeacherSubject');
    const Subject = require('../models/Subject');
    const Semester = require('../models/Semester');
    const Course = require('../models/Course');

    const mappings = await TeacherSubject.find({ teacherId: req.user.id });
    const subjectIds = mappings.map(m => m.subjectId);
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    const semIds = [...new Set(subjects.map(s => String(s.semesterId)))];

    const allStudents = await Student.find({});
    const filteredStudents = allStudents.filter(student => semIds.includes(String(student.semesterId)));

    const populated = [];
    for (const student of filteredStudents) {
      const sem = await Semester.findById(student.semesterId);
      const course = await Course.findById(student.courseId);
      populated.push({
        id: student._id,
        name: student.name,
        email: student.email,
        rollNo: student.rollNo,
        className: course && sem ? `${course.name} (${sem.name})` : 'N/A'
      });
    }

    return sendResponse(res, 200, true, 'Students fetched successfully.', populated);
  } catch (error) {
    next(error);
  }
};
