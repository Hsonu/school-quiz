const Notes = require('../models/Notes');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Attendance = require('../models/Attendance');
const Marks = require('../models/Marks');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const TeacherSubject = require('../models/TeacherSubject');
const Class = require('../models/Class');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const sendResponse = require('../utils/response');

// --- Notes Operations ---
exports.uploadNotes = async (req, res, next) => {
  try {
    const { title, description, subjectId } = req.body;
    if (!title || !subjectId) {
      return sendResponse(res, 400, false, 'Title and Subject are required.');
    }
    if (!req.file) {
      return sendResponse(res, 400, false, 'Please upload a notes file.');
    }

    const note = await Notes.create({
      title,
      description: description || '',
      subjectId,
      teacherId: req.user.id,
      filePath: `/uploads/${req.file.filename}`
    });

    return sendResponse(res, 201, true, 'Notes uploaded successfully.', note);
  } catch (error) {
    next(error);
  }
};

exports.getNotes = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id);
      if (!student) return sendResponse(res, 404, false, 'Student not found.');

      const semSubjects = await Subject.find({ semesterId: student.semesterId });
      const subjectIds = semSubjects.map(s => String(s._id));
      query = { subjectId: { $in: subjectIds } };
    }

    const notesList = await Notes.find(query);
    const subjectIds = [...new Set(notesList.map(n => n.subjectId).filter(Boolean))];
    const teacherIds = [...new Set(notesList.map(n => n.teacherId).filter(Boolean))];

    const [subjects, teachers] = await Promise.all([
      Subject.find({ _id: { $in: subjectIds } }),
      Teacher.find({ _id: { $in: teacherIds } })
    ]);

    const subjectsMap = new Map(subjects.map(s => [String(s._id), s]));
    const teachersMap = new Map(teachers.map(t => [String(t._id), t]));

    const populated = [];
    for (const note of notesList) {
      const sub = subjectsMap.get(String(note.subjectId));
      const teacher = teachersMap.get(String(note.teacherId));
      populated.push({
        id: note._id,
        title: note.title,
        description: note.description,
        filePath: note.filePath,
        subjectId: note.subjectId,
        subjectName: sub ? sub.name : 'N/A',
        teacherName: teacher ? teacher.name : 'N/A',
        createdAt: note.createdAt
      });
    }

    let resultData = populated;

    // 1. Filter by subjectId
    if (req.query.subjectId) {
      resultData = resultData.filter(item => String(item.subjectId) === String(req.query.subjectId));
    }

    // 2. Search query
    if (req.query.search) {
      const searchLower = String(req.query.search).toLowerCase();
      resultData = resultData.filter(item => 
        String(item.title).toLowerCase().includes(searchLower) || 
        String(item.description || '').toLowerCase().includes(searchLower)
      );
    }

    // 3. Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1; // Default to desc (newest first)

    resultData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'createdAt') {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return sendResponse(res, 200, true, 'Notes retrieved.', resultData);
  } catch (error) {
    next(error);
  }
};

exports.deleteNotes = async (req, res, next) => {
  try {
    const note = await Notes.findById(req.params.id);
    if (!note) return sendResponse(res, 404, false, 'Notes file not found.');
    if (String(note.teacherId) !== String(req.user.id)) {
      return sendResponse(res, 403, false, 'Unauthorized to delete this notes file.');
    }

    await Notes.findByIdAndDelete(req.params.id);
    return sendResponse(res, 200, true, 'Notes deleted.');
  } catch (error) {
    next(error);
  }
};

// --- Assignment Operations ---
exports.createAssignment = async (req, res, next) => {
  try {
    const { title, description, subjectId, dueDate } = req.body;
    if (!title || !subjectId || !dueDate) {
      return sendResponse(res, 400, false, 'Title, Subject, and Due Date are required.');
    }

    let filePath = '';
    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
    }

    const assignment = await Assignment.create({
      title,
      description: description || '',
      subjectId,
      teacherId: req.user.id,
      dueDate: new Date(dueDate),
      filePath
    });

    return sendResponse(res, 201, true, 'Assignment created successfully.', assignment);
  } catch (error) {
    next(error);
  }
};

exports.getAssignments = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id);
      if (!student) return sendResponse(res, 404, false, 'Student not found.');

      const semSubjects = await Subject.find({ semesterId: student.semesterId });
      const subjectIds = semSubjects.map(s => String(s._id));
      query = { subjectId: { $in: subjectIds } };
    }

    const assignments = await Assignment.find(query);
    const subjectIds = [...new Set(assignments.map(a => a.subjectId).filter(Boolean))];
    const teacherIds = [...new Set(assignments.map(a => a.teacherId).filter(Boolean))];

    const [subjects, teachers] = await Promise.all([
      Subject.find({ _id: { $in: subjectIds } }),
      Teacher.find({ _id: { $in: teacherIds } })
    ]);

    const subjectsMap = new Map(subjects.map(s => [String(s._id), s]));
    const teachersMap = new Map(teachers.map(t => [String(t._id), t]));

    let submissionsMap = new Map();
    if (req.user.role === 'student' && assignments.length > 0) {
      const assignmentIds = assignments.map(a => String(a._id));
      const subs = await AssignmentSubmission.find({ assignmentId: { $in: assignmentIds }, studentId: req.user.id });
      submissionsMap = new Map(subs.map(s => [String(s.assignmentId), s]));
    }

    const populated = [];
    for (const a of assignments) {
      const sub = subjectsMap.get(String(a.subjectId));
      const teacher = teachersMap.get(String(a.teacherId));

      let submissionStatus = 'Unsubmitted';
      let submissionScore = '-';
      if (req.user.role === 'student') {
        const subRecord = submissionsMap.get(String(a._id));
        if (subRecord) {
          submissionStatus = subRecord.status;
          submissionScore = subRecord.status === 'Graded' ? subRecord.marks : 'Pending Grading';
        }
      }

      populated.push({
        id: a._id,
        title: a.title,
        description: a.description,
        dueDate: a.dueDate,
        filePath: a.filePath,
        subjectId: a.subjectId,
        subjectName: sub ? sub.name : 'N/A',
        teacherName: teacher ? teacher.name : 'N/A',
        submissionStatus,
        submissionScore
      });
    }

    let resultData = populated;

    // 1. Filter by subjectId
    if (req.query.subjectId) {
      resultData = resultData.filter(item => String(item.subjectId) === String(req.query.subjectId));
    }

    // 2. Filter by status (for student: Unsubmitted, Pending, Graded)
    if (req.query.status) {
      resultData = resultData.filter(item => String(item.submissionStatus).toLowerCase() === String(req.query.status).toLowerCase());
    }

    // 3. Search query
    if (req.query.search) {
      const searchLower = String(req.query.search).toLowerCase();
      resultData = resultData.filter(item => 
        String(item.title).toLowerCase().includes(searchLower) || 
        String(item.description || '').toLowerCase().includes(searchLower)
      );
    }

    // 4. Date range filter
    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      resultData = resultData.filter(item => new Date(item.dueDate) >= start);
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      resultData = resultData.filter(item => new Date(item.dueDate) <= end);
    }

    // 5. Sorting
    const sortBy = req.query.sortBy || 'dueDate';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; // Default to asc (earliest due date first)

    resultData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'dueDate') {
        valA = new Date(valA || 0);
        valB = new Date(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return sendResponse(res, 200, true, 'Assignments retrieved.', resultData);
  } catch (error) {
    next(error);
  }
};

exports.submitAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    if (!req.file) {
      return sendResponse(res, 400, false, 'Please attach your assignment solution.');
    }

    const existing = await AssignmentSubmission.findOne({ assignmentId, studentId: req.user.id });
    if (existing) {
      return sendResponse(res, 400, false, 'You have already submitted this assignment.');
    }

    const submission = await AssignmentSubmission.create({
      assignmentId,
      studentId: req.user.id,
      filePath: `/uploads/${req.file.filename}`,
      status: 'Pending'
    });

    return sendResponse(res, 201, true, 'Assignment submitted successfully!', submission);
  } catch (error) {
    next(error);
  }
};

exports.getSubmissions = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const submissions = await AssignmentSubmission.find({ assignmentId });
    const studentIds = [...new Set(submissions.map(s => s.studentId).filter(Boolean))];
    const students = await Student.find({ _id: { $in: studentIds } });
    const studentsMap = new Map(students.map(s => [String(s._id), s]));

    const populated = [];
    for (const sub of submissions) {
      const student = studentsMap.get(String(sub.studentId));
      populated.push({
        id: sub._id,
        studentName: student ? student.name : 'Unknown Student',
        rollNo: student ? student.rollNo : 'N/A',
        filePath: sub.filePath,
        submittedAt: sub.submittedAt,
        status: sub.status,
        marks: sub.marks,
        feedback: sub.feedback
      });
    }
    return sendResponse(res, 200, true, 'Submissions retrieved.', populated);
  } catch (error) {
    next(error);
  }
};

exports.gradeSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { marks, feedback } = req.body;

    if (marks === undefined) return sendResponse(res, 400, false, 'Marks are required.');

    const sub = await AssignmentSubmission.findByIdAndUpdate(id, {
      marks: Number(marks),
      feedback: feedback || '',
      status: 'Graded'
    }, { new: true });

    return sendResponse(res, 200, true, 'Submission graded.', sub);
  } catch (error) {
    next(error);
  }
};

// --- Attendance Operations ---
exports.takeAttendance = async (req, res, next) => {
  try {
    const { subjectId, date, statusLogs } = req.body; // statusLogs: [{ studentId, status: 'Present'/'Absent'/'Late' }]
    if (!subjectId || !date || !statusLogs || !Array.isArray(statusLogs)) {
      return sendResponse(res, 400, false, 'Subject, Date, and statusLogs are required.');
    }

    const parsedDate = new Date(date);
    parsedDate.setHours(12, 0, 0, 0); // normalize time

    for (const log of statusLogs) {
      // Find classId from student profile
      const student = await Student.findById(log.studentId);
      const classId = student ? student.classId || 'default' : 'default';

      // Check if entry already exists for this student on this day
      const existing = await Attendance.findOne({
        studentId: log.studentId,
        date: parsedDate
      });

      if (existing) {
        await Attendance.findByIdAndUpdate(existing._id, { status: log.status });
      } else {
        await Attendance.create({
          studentId: log.studentId,
          classId,
          date: parsedDate,
          status: log.status
        });
      }
    }

    return sendResponse(res, 200, true, 'Attendance logged successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getStudentAttendance = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const logs = await Attendance.find({ studentId });

    let total = logs.length;
    let present = logs.filter(l => l.status === 'Present' || l.status === 'Late').length;
    let percentage = total > 0 ? Math.round((present / total) * 100) : 100;

    return sendResponse(res, 200, true, 'Attendance stats loaded.', {
      total,
      present,
      percentage,
      logs: logs.sort((a, b) => new Date(b.date) - new Date(a.date))
    });
  } catch (error) {
    next(error);
  }
};

// --- Marks Upload Operations ---
exports.uploadMarks = async (req, res, next) => {
  try {
    const { studentId, subjectId, assessmentId, assessmentType, marksObtained, totalMarks } = req.body;
    if (studentId === undefined || !subjectId || !assessmentId || marksObtained === undefined || totalMarks === undefined) {
      return sendResponse(res, 400, false, 'All fields are required.');
    }

    const obMarks = Number(marksObtained);
    const totMarks = Number(totalMarks);

    if (isNaN(obMarks) || obMarks < 0) {
      return sendResponse(res, 400, false, 'Obtained marks cannot be negative.');
    }
    if (obMarks > totMarks) {
      return sendResponse(res, 400, false, 'Obtained marks cannot exceed Total Marks.');
    }

    const existing = await Marks.findOne({ studentId, subjectId, assessmentId });
    let markRecord;
    if (existing) {
      markRecord = await Marks.findByIdAndUpdate(existing._id, { marksObtained: obMarks, totalMarks: totMarks }, { new: true });
    } else {
      markRecord = await Marks.create({
        studentId, subjectId, assessmentId, assessmentType: assessmentType || 'quiz', marksObtained: obMarks, totalMarks: totMarks
      });
    }

    const isValidObjectId = id => /^[0-9a-fA-F]{24}$/.test(String(id));
    const Exam = require('../models/Exam');
    const Quiz = require('../models/Quiz');
    const Result = require('../models/Result');

    let passMarks = 40;
    let examId = undefined;
    let quizId = undefined;

    if (assessmentType === 'exam') {
      const exam = isValidObjectId(assessmentId) 
        ? await Exam.findById(assessmentId) 
        : await Exam.findOne({ title: assessmentId, subjectId });
      if (exam) {
        passMarks = exam.passMarks || 40;
        examId = exam._id;
      }
    } else if (assessmentType === 'quiz') {
      const quiz = isValidObjectId(assessmentId)
        ? await Quiz.findById(assessmentId)
        : await Quiz.findOne({ title: assessmentId, subjectId });
      if (quiz) {
        quizId = quiz._id;
      }
    }

    const percentage = totMarks > 0 ? Math.round((obMarks / totMarks) * 100) : 0;
    const status = obMarks >= passMarks ? 'Pass' : 'Fail';

    const resultQuery = { studentId };
    if (examId) resultQuery.examId = examId;
    else if (quizId) resultQuery.quizId = quizId;
    else resultQuery.attemptId = 'manual_' + markRecord._id;

    const existingResult = await Result.findOne(resultQuery);
    if (existingResult) {
      await Result.findByIdAndUpdate(existingResult._id, {
        score: obMarks,
        totalMarks: totMarks,
        percentage,
        status
      });
    } else {
      await Result.create({
        attemptId: 'manual_' + markRecord._id,
        studentId,
        examId,
        quizId,
        type: assessmentType || 'quiz',
        score: obMarks,
        totalMarks: totMarks,
        percentage,
        status
      });
    }

    return sendResponse(res, 200, true, 'Marks updated successfully.', markRecord);
  } catch (error) {
    next(error);
  }
};

exports.getStudentMarks = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const marksList = await Marks.find({ studentId });
    const subjectIds = [...new Set(marksList.map(m => m.subjectId).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    const subjectsMap = new Map(subjects.map(s => [String(s._id), s]));

    const populated = [];
    for (const m of marksList) {
      const sub = subjectsMap.get(String(m.subjectId));
      populated.push({
        id: m._id,
        subjectName: sub ? sub.name : 'N/A',
        assessmentType: m.assessmentType,
        marksObtained: m.marksObtained,
        totalMarks: m.totalMarks,
        percentage: m.totalMarks > 0 ? Math.round((m.marksObtained / m.totalMarks) * 100) : 0
      });
    }
    return sendResponse(res, 200, true, 'Marks list loaded.', populated);
  } catch (error) {
    next(error);
  }
};

// --- Teacher / Student Assigned Subjects list ---
exports.getMyAssignedSubjects = async (req, res, next) => {
  try {
    let subjects = [];
    if (req.user.role === 'teacher') {
      const mappings = await TeacherSubject.find({ teacherId: req.user.id });
      const subjectIds = mappings.map(m => m.subjectId);
      subjects = await Subject.find({ _id: { $in: subjectIds } });
    } else if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id);
      if (!student) return sendResponse(res, 404, false, 'Student not found.');
      subjects = await Subject.find({ semesterId: student.semesterId });
    }

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

    const result = [];
    for (const s of subjects) {
      const dept = deptsMap.get(String(s.departmentId));
      const course = coursesMap.get(String(s.courseId));
      const sem = semsMap.get(String(s.semesterId));
      result.push({
        id: s._id,
        name: s.name,
        departmentId: s.departmentId,
        departmentName: dept ? dept.name : 'N/A',
        courseId: s.courseId,
        courseName: course ? course.name : 'N/A',
        semesterId: s.semesterId,
        semesterName: sem ? sem.name : 'N/A',
        classId: s.classId || ''
      });
    }
    return sendResponse(res, 200, true, 'Assigned subjects fetched.', result);
  } catch (error) {
    next(error);
  }
};

// --- Get Students enrolled in a Subject ---
exports.getSubjectStudents = async (req, res, next) => {
  try {
    const subjectId = req.params.subjectId;
    const subject = await Subject.findById(subjectId);
    if (!subject) return sendResponse(res, 404, false, 'Subject not found.');

    // Students enrolled in this subject have matching semesterId and courseId
    const students = await Student.find({
      semesterId: subject.semesterId,
      courseId: subject.courseId
    });

    let attendanceMap = new Map();
    if (req.query.date && students.length > 0) {
      const parsedDate = new Date(req.query.date);
      parsedDate.setHours(12, 0, 0, 0);
      const studentIds = students.map(s => String(s._id));
      const logs = await Attendance.find({ studentId: { $in: studentIds }, date: parsedDate });
      attendanceMap = new Map(logs.map(l => [String(l.studentId), l.status]));
    }

    const populated = [];
    for (const s of students) {
      // Find current attendance log if date is sent
      let attendanceStatus = '';
      if (req.query.date) {
        attendanceStatus = attendanceMap.get(String(s._id)) || '';
      }

      populated.push({
        id: s._id,
        name: s.name,
        rollNo: s.rollNo,
        email: s.email,
        attendanceStatus
      });
    }

    return sendResponse(res, 200, true, 'Students loaded.', populated);
  } catch (error) {
    next(error);
  }
};
