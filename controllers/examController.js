const Exam = require('../models/Exam');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Result = require('../models/Result');
const Department = require('../models/Department');
const Course = require('../models/Course');
const Semester = require('../models/Semester');
const ExamAttempt = require('../models/ExamAttempt');
const calculateMarks = require('../utils/calculateMarks');
const sendResponse = require('../utils/response');

exports.createExam = async (req, res, next) => {
  try {
    const { title, description, subjectId, duration, examDate, questions } = req.body;

    if (!title || !subjectId || !examDate || !questions || !Array.isArray(questions) || questions.length === 0) {
      return sendResponse(res, 400, false, 'Title, Subject, Exam Date, and at least one Question are required.');
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendResponse(res, 404, false, 'Subject not found.');
    }

    // Calculate marks based on points of selected questions
    let totalMarks = 0;
    for (const qId of questions) {
      const q = await Question.findById(qId);
      if (q) {
        totalMarks += Number(q.points || 1);
      }
    }

    let passMarks = Number(req.body.passMarks !== undefined ? req.body.passMarks : 40);
    if (isNaN(passMarks) || passMarks < 0) {
      return sendResponse(res, 400, false, 'Pass marks cannot be negative.');
    }
    if (passMarks > totalMarks) {
      return sendResponse(res, 400, false, 'Pass marks cannot be greater than Total Marks.');
    }
    const failMarks = Math.max(0, passMarks - 1);

    const exam = await Exam.create({
      title,
      description: description || '',
      subjectId,
      classId: subject.classId || '',
      teacherId: req.user.id,
      questions,
      duration: Number(duration || 120),
      totalMarks,
      passMarks,
      failMarks,
      examDate: new Date(examDate),
      isApproved: false // Requires Principal approval
    });

    return sendResponse(res, 201, true, 'Exam scheduled successfully and submitted to Principal for approval.', exam);
  } catch (error) {
    next(error);
  }
};

exports.getExams = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else if (req.user.role === 'student') {
      // Students only see approved exams for their semester
      const student = await Student.findById(req.user.id);
      if (!student) return sendResponse(res, 404, false, 'Student not found.');

      // Fetch subjects of student's semester
      const semesterSubjects = await Subject.find({ semesterId: student.semesterId });
      const subjectIds = semesterSubjects.map(s => String(s._id));
      query = {
        subjectId: { $in: subjectIds },
        isApproved: true
      };
    } else if (req.user.role === 'principal') {
      // Principal can view all
      query = {};
    }

    const exams = await Exam.find(query);
    const subjectIds = [...new Set(exams.map(ex => ex.subjectId).filter(Boolean))];
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    const subjectsMap = new Map(subjects.map(s => [String(s._id), s]));

    const courseIds = [...new Set(subjects.map(s => s.courseId).filter(Boolean))];
    const semesterIds = [...new Set(subjects.map(s => s.semesterId).filter(Boolean))];

    const [courses, semesters] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }),
      Semester.find({ _id: { $in: semesterIds } })
    ]);

    const coursesMap = new Map(courses.map(c => [String(c._id), c]));
    const semestersMap = new Map(semesters.map(sem => [String(sem._id), sem]));

    let resultsMap = new Map();
    if (req.user.role === 'student' && exams.length > 0) {
      const examIds = exams.map(ex => String(ex._id));
      const results = await Result.find({ examId: { $in: examIds }, studentId: req.user.id });
      resultsMap = new Map(results.map(r => [String(r.examId), r]));
    }

    const populated = [];
    for (const ex of exams) {
      const sub = subjectsMap.get(String(ex.subjectId));

      let courseName = 'N/A';
      let semesterName = 'N/A';
      if (sub) {
        const course = coursesMap.get(String(sub.courseId));
        const sem = semestersMap.get(String(sub.semesterId));
        if (course) courseName = course.name;
        if (sem) semesterName = sem.name;
      }

      // Check if student already attempted
      let alreadyAttempted = false;
      let score = null;
      let percentage = null;
      let status = '';
      if (req.user.role === 'student') {
        const resObj = resultsMap.get(String(ex._id));
        if (resObj) {
          alreadyAttempted = true;
          score = resObj.score;
          percentage = resObj.percentage;
          status = resObj.status;
        }
      }

      populated.push({
        id: ex._id,
        title: ex.title,
        description: ex.description,
        duration: ex.duration,
        totalMarks: ex.totalMarks,
        questionsCount: ex.questions.length,
        examDate: ex.examDate,
        isApproved: ex.isApproved,
        subjectId: ex.subjectId,
        subjectName: sub ? sub.name : 'Unknown Subject',
        courseName,
        semesterName,
        alreadyAttempted,
        score,
        percentage,
        status
      });
    }

    let resultData = populated;

    // 1. Filter by subjectId
    if (req.query.subjectId) {
      resultData = resultData.filter(item => String(item.subjectId) === String(req.query.subjectId));
    }

    // 2. Filter by status (for student: attempted, unattempted)
    if (req.query.status) {
      if (req.query.status.toLowerCase() === 'attempted') {
        resultData = resultData.filter(item => item.alreadyAttempted === true);
      } else if (req.query.status.toLowerCase() === 'unattempted') {
        resultData = resultData.filter(item => item.alreadyAttempted === false);
      }
    }

    // 3. Filter by isApproved
    if (req.query.isApproved) {
      const isApp = req.query.isApproved === 'true';
      resultData = resultData.filter(item => item.isApproved === isApp);
    }

    // 4. Search query
    if (req.query.search) {
      const searchLower = String(req.query.search).toLowerCase();
      resultData = resultData.filter(item => 
        String(item.title).toLowerCase().includes(searchLower) || 
        String(item.description || '').toLowerCase().includes(searchLower)
      );
    }

    // 5. Date range filter
    if (req.query.startDate) {
      const start = new Date(req.query.startDate);
      resultData = resultData.filter(item => new Date(item.examDate) >= start);
    }
    if (req.query.endDate) {
      const end = new Date(req.query.endDate);
      end.setHours(23, 59, 59, 999);
      resultData = resultData.filter(item => new Date(item.examDate) <= end);
    }

    // 6. Sorting
    const sortBy = req.query.sortBy || 'examDate';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; // Default to asc (examDate)

    resultData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'examDate') {
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

    return sendResponse(res, 200, true, 'Exams retrieved.', resultData);
  } catch (error) {
    next(error);
  }
};

exports.getExamDetails = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendResponse(res, 404, false, 'Exam not found.');

    const sub = await Subject.findById(exam.subjectId);

    // Populate questions
    const questionsDocs = [];
    for (const qId of exam.questions) {
      const q = await Question.findById(qId);
      if (q) {
        const qPayload = {
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points
        };
        if (req.user.role === 'teacher') {
          qPayload.correctAnswer = q.correctAnswer;
        }
        questionsDocs.push(qPayload);
      }
    }

    return sendResponse(res, 200, true, 'Exam details retrieved.', {
      id: exam._id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      examDate: exam.examDate,
      subjectId: exam.subjectId,
      courseId: sub ? sub.courseId : 'N/A',
      semesterId: sub ? sub.semesterId : 'N/A',
      subjectName: sub ? sub.name : 'N/A',
      questions: questionsDocs
    });
  } catch (error) {
    next(error);
  }
};

exports.submitExam = async (req, res, next) => {
  try {
    const examId = req.params.id;
    const { answers } = req.body; // [{ questionId, selectedAnswer }]

    if (!answers || !Array.isArray(answers)) {
      return sendResponse(res, 400, false, 'Answers are required.');
    }

    const exam = await Exam.findById(examId);
    if (!exam) return sendResponse(res, 404, false, 'Exam not found.');

    const existingResult = await Result.findOne({ examId, studentId: req.user.id });
    if (existingResult) {
      return sendResponse(res, 400, false, 'You have already attempted this examination.');
    }

    const questionsList = [];
    for (const qId of exam.questions) {
      const q = await Question.findById(qId);
      if (q) questionsList.push(q);
    }

    const { score, totalQuestions, gradedAnswers } = calculateMarks(answers, questionsList);
    const percentage = exam.totalMarks > 0 ? Math.round((score / exam.totalMarks) * 100) : 0;
    const status = score >= (exam.passMarks !== undefined ? exam.passMarks : 40) ? 'Pass' : 'Fail';

    // Save Attempt
    const attempt = await ExamAttempt.create({
      examId,
      studentId: req.user.id,
      answers: gradedAnswers,
      score,
      totalQuestions,
      timeTaken: req.body.timeTaken || 0,
      completedAt: new Date()
    });

    const result = await Result.create({
      attemptId: attempt._id,
      studentId: req.user.id,
      examId,
      type: 'exam',
      score,
      totalMarks: exam.totalMarks,
      percentage,
      status
    });

    return sendResponse(res, 201, true, 'Examination submitted successfully.', result);
  } catch (error) {
    next(error);
  }
};

exports.deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return sendResponse(res, 404, false, 'Exam not found.');

    if (String(exam.teacherId) !== String(req.user.id)) {
      return sendResponse(res, 403, false, 'Unauthorized to delete this exam.');
    }

    await Exam.findByIdAndDelete(req.params.id);
    await Result.deleteMany({ examId: req.params.id });

    return sendResponse(res, 200, true, 'Exam deleted successfully.');
  } catch (error) {
    next(error);
  }
};

exports.updateExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, subjectId, duration, examDate, questions } = req.body;

    const exam = await Exam.findById(id);
    if (!exam) return sendResponse(res, 404, false, 'Exam not found.');

    if (String(exam.teacherId) !== String(req.user.id) && req.user.role !== 'owner') {
      return sendResponse(res, 403, false, 'Unauthorized to edit this exam.');
    }

    if (!title || !subjectId || !examDate || !questions || !Array.isArray(questions) || questions.length === 0) {
      return sendResponse(res, 400, false, 'Title, Subject, Exam Date, and at least one Question are required.');
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendResponse(res, 404, false, 'Subject not found.');
    }

    // Calculate marks based on points of selected questions
    let totalMarks = 0;
    for (const qId of questions) {
      const q = await Question.findById(qId);
      if (q) {
        totalMarks += Number(q.points || 1);
      }
    }

    let passMarks = Number(req.body.passMarks !== undefined ? req.body.passMarks : (exam.passMarks || 40));
    if (isNaN(passMarks) || passMarks < 0) {
      return sendResponse(res, 400, false, 'Pass marks cannot be negative.');
    }
    if (passMarks > totalMarks) {
      return sendResponse(res, 400, false, 'Pass marks cannot be greater than Total Marks.');
    }

    // Check if marks/results are already published/recorded for this exam
    const Marks = require('../models/Marks');
    const resultsCount = await Result.countDocuments({ examId: id });
    const marksCount = await Marks.countDocuments({ assessmentId: id });
    if (resultsCount > 0 || marksCount > 0) {
      if (req.body.passMarks !== undefined && Number(req.body.passMarks) !== Number(exam.passMarks)) {
        return sendResponse(res, 400, false, 'Cannot edit Pass Marks after results are recorded or published.');
      }
    }

    const failMarks = Math.max(0, passMarks - 1);

    const updated = await Exam.findByIdAndUpdate(id, {
      title,
      description: description || '',
      subjectId,
      classId: subject.classId || '',
      questions,
      duration: Number(duration || 120),
      totalMarks,
      passMarks,
      failMarks,
      examDate: new Date(examDate),
      isApproved: false // Reset approval status to pending
    }, { new: true });

    return sendResponse(res, 200, true, 'Exam details updated successfully and re-submitted for approval.', updated);
  } catch (error) {
    next(error);
  }
};

