const Result = require('../models/Result');
const QuizAttempt = require('../models/QuizAttempt');
const Quiz = require('../models/Quiz');
const Student = require('../models/Student');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Exam = require('../models/Exam');
const ExamAttempt = require('../models/ExamAttempt');
const Semester = require('../models/Semester');
const Course = require('../models/Course');
const sendResponse = require('../utils/response');

const isValidObjectId = id => /^[0-9a-fA-F]{24}$/.test(String(id));

exports.getResultById = async (req, res, next) => {
  try {
    const resultId = req.params.id;
    if (!isValidObjectId(resultId)) {
      return sendResponse(res, 404, false, 'Invalid Result ID.');
    }

    let result = await Result.findById(resultId);

    // Fallback: If not found by Result ID, search by attemptId
    if (!result) {
      result = await Result.findOne({ attemptId: resultId });
    }

    if (!result) {
      return sendResponse(res, 404, false, 'Result record not found.');
    }

    // Security: Student can only view their own result
    if (req.user.role === 'student' && String(result.studentId) !== String(req.user.id)) {
      return sendResponse(res, 403, false, 'Unauthorized to view this result.');
    }

    const student = isValidObjectId(result.studentId) ? await Student.findById(result.studentId) : null;

    let assessmentTitle = 'Deleted Assessment';
    let subjectId = '';
    let classId = '';
    let attempt = null;

    if (result.type === 'exam' || result.examId) {
      const exam = isValidObjectId(result.examId) ? await Exam.findById(result.examId) : null;
      if (exam) {
        assessmentTitle = exam.title;
        subjectId = exam.subjectId;
        classId = exam.classId;
      }
      attempt = isValidObjectId(result.attemptId) ? await ExamAttempt.findById(result.attemptId) : null;
    } else {
      const quiz = isValidObjectId(result.quizId) ? await Quiz.findById(result.quizId) : null;
      if (quiz) {
        assessmentTitle = quiz.title;
        subjectId = quiz.subjectId;
        classId = quiz.classId;
      }
      attempt = isValidObjectId(result.attemptId) ? await QuizAttempt.findById(result.attemptId) : null;
    }

    if (!attempt) {
      if (result.type === 'exam' || result.examId) {
        const exam = isValidObjectId(result.examId) ? await Exam.findById(result.examId) : null;
        if (exam) {
          attempt = {
            _id: result.attemptId || 'mock_attempt',
            examId: result.examId,
            studentId: result.studentId,
            score: result.score,
            totalQuestions: exam.questions.length,
            timeTaken: 0,
            completedAt: result.createdAt,
            answers: exam.questions.map(qId => ({
              questionId: qId,
              selectedAnswer: -1,
              isCorrect: false
            }))
          };
        }
      } else {
        const quiz = isValidObjectId(result.quizId) ? await Quiz.findById(result.quizId) : null;
        if (quiz) {
          attempt = {
            _id: result.attemptId || 'mock_attempt',
            quizId: result.quizId,
            studentId: result.studentId,
            score: result.score,
            totalQuestions: quiz.questions.length,
            timeTaken: 0,
            completedAt: result.createdAt,
            answers: quiz.questions.map(qId => ({
              questionId: qId,
              selectedAnswer: -1,
              isCorrect: false
            }))
          };
        }
      }
    }

    if (!attempt) {
      return sendResponse(res, 404, false, 'Associated attempt details not found.');
    }

    // Populate question details along with student's responses in batch
    const questionIds = attempt.answers.map(ans => ans.questionId).filter(isValidObjectId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionsMap = new Map(questions.map(q => [String(q._id), q]));

    const questionsResponse = [];
    for (const ans of attempt.answers) {
      const q = questionsMap.get(String(ans.questionId));
      if (q) {
        questionsResponse.push({
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          selectedAnswer: ans.selectedAnswer,
          isCorrect: ans.isCorrect,
          points: q.points
        });
      }
    }

    const sub = isValidObjectId(subjectId) ? await Subject.findById(subjectId) : null;
    const cls = isValidObjectId(classId) ? await Class.findById(classId) : null;

    let passMarks = 40;
    if (result.type === 'exam' || result.examId) {
      const exam = isValidObjectId(result.examId) ? await Exam.findById(result.examId) : null;
      if (exam) {
        passMarks = exam.passMarks || 40;
      }
    }

    const detailedResult = {
      resultId: result._id,
      score: result.score,
      totalMarks: result.totalMarks,
      percentage: result.percentage,
      status: result.status,
      timeTaken: attempt.timeTaken,
      completedAt: attempt.completedAt,
      studentName: student ? student.name : 'Unknown Student',
      rollNo: student ? student.rollNo : 'N/A',
      quizTitle: assessmentTitle,
      subjectName: sub ? sub.name : 'Unknown Subject',
      className: cls ? cls.name : 'Unknown Class',
      passMarks,
      answers: questionsResponse
    };

    return sendResponse(res, 200, true, 'Detailed results retrieved.', detailedResult);
  } catch (error) {
    next(error);
  }
};

exports.getResults = async (req, res, next) => {
  try {
    let results = [];

    if (req.user.role === 'student') {
      // Fetch results of the student
      results = await Result.find({ studentId: req.user.id });
    } else {
      // Fetch results of quizzes created by this teacher
      const teacherQuizzes = await Quiz.find({ teacherId: req.user.id });
      const teacherQuizIds = teacherQuizzes.map(q => String(q._id));
      results = await Result.find({ quizId: { $in: teacherQuizIds } });
    }

    // Enrich items in batch
    const studentIds = [...new Set(results.map(r => r.studentId).filter(isValidObjectId))];
    const quizIds = [...new Set(results.map(r => r.quizId).filter(isValidObjectId))];
    const examIds = [...new Set(results.map(r => r.examId).filter(isValidObjectId))];

    const [students, quizzes, exams] = await Promise.all([
      Student.find({ _id: { $in: studentIds } }),
      Quiz.find({ _id: { $in: quizIds } }),
      Exam.find({ _id: { $in: examIds } })
    ]);

    const studentsMap = new Map(students.map(s => [String(s._id), s]));
    const quizzesMap = new Map(quizzes.map(q => [String(q._id), q]));
    const examsMap = new Map(exams.map(e => [String(e._id), e]));

    const classIds = [...new Set([
      ...quizzes.map(q => q.classId),
      ...exams.map(e => e.classId)
    ])].filter(isValidObjectId);

    const subjectIds = [...new Set([
      ...quizzes.map(q => q.subjectId),
      ...exams.map(e => e.subjectId)
    ])].filter(isValidObjectId);

    const [classes, subjects] = await Promise.all([
      Class.find({ _id: { $in: classIds } }),
      Subject.find({ _id: { $in: subjectIds } })
    ]);

    const semesterIds = [...new Set(subjects.map(s => s.semesterId))].filter(isValidObjectId);
    const courseIds = [...new Set(subjects.map(s => s.courseId))].filter(isValidObjectId);

    const [semesters, courses] = await Promise.all([
      Semester.find({ _id: { $in: semesterIds } }),
      Course.find({ _id: { $in: courseIds } })
    ]);

    const classesMap = new Map(classes.map(c => [String(c._id), c]));
    const subjectsMap = new Map(subjects.map(s => [String(s._id), s]));
    const semsMap = new Map(semesters.map(sem => [String(sem._id), sem]));
    const coursesMap = new Map(courses.map(c => [String(c._id), c]));

    const enriched = [];
    for (const r of results) {
      const student = studentsMap.get(String(r.studentId));
      let quiz = null;
      let exam = null;
      let cls = null;
      let sub = null;

      if (r.type === 'quiz' || r.quizId) {
        quiz = quizzesMap.get(String(r.quizId));
        cls = quiz ? classesMap.get(String(quiz.classId)) : null;
        sub = quiz ? subjectsMap.get(String(quiz.subjectId)) : null;
      } else if (r.type === 'exam' || r.examId) {
        exam = examsMap.get(String(r.examId));
        cls = exam ? classesMap.get(String(exam.classId)) : null;
        sub = exam ? subjectsMap.get(String(exam.subjectId)) : null;
      }

      const sem = sub ? semsMap.get(String(sub.semesterId)) : null;
      const course = sub ? coursesMap.get(String(sub.courseId)) : null;

      enriched.push({
        id: r._id,
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        status: r.status,
        type: r.type,
        createdAt: r.createdAt,
        studentName: student ? student.name : 'Unknown Student',
        rollNo: student ? student.rollNo : 'N/A',
        quizTitle: quiz ? quiz.title : (exam ? exam.title : 'Deleted Assessment'),
        className: cls ? cls.name : 'Unknown Class',
        semesterName: sem ? sem.name : 'Unknown Semester',
        courseName: course ? course.name : 'Unknown Course',
        subjectName: sub ? sub.name : 'Unknown Subject',
        classId: cls ? String(cls._id) : '',
        courseId: course ? String(course._id) : '',
        semesterId: sem ? String(sem._id) : '',
        subjectId: sub ? String(sub._id) : '',
        passMarks: exam ? (exam.passMarks !== undefined ? exam.passMarks : 40) : 40
      });
    }

    let resultData = enriched;

    // Apply filters
    if (req.query.search) {
      const searchLower = String(req.query.search).toLowerCase();
      resultData = resultData.filter(item => String(item.quizTitle).toLowerCase().includes(searchLower));
    }
    if (req.query.type) {
      resultData = resultData.filter(item => String(item.type) === String(req.query.type));
    }
    if (req.query.classId) {
      resultData = resultData.filter(item => String(item.classId) === String(req.query.classId));
    }
    if (req.query.courseId) {
      resultData = resultData.filter(item => String(item.courseId) === String(req.query.courseId));
    }
    if (req.query.semesterId) {
      resultData = resultData.filter(item => String(item.semesterId) === String(req.query.semesterId));
    }
    if (req.query.subjectId) {
      resultData = resultData.filter(item => String(item.subjectId) === String(req.query.subjectId));
    }
    if (req.query.endDate) {
      const endLimit = new Date(req.query.endDate);
      endLimit.setHours(23, 59, 59, 999);
      resultData = resultData.filter(item => new Date(item.createdAt) <= endLimit);
    }

    // Apply Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    resultData.sort((a, b) => {
      let valA, valB;
      if (sortBy === 'createdAt') {
        valA = new Date(a.createdAt);
        valB = new Date(b.createdAt);
      } else if (sortBy === 'percentage') {
        valA = a.percentage;
        valB = b.percentage;
      } else if (sortBy === 'score') {
        valA = a.score;
        valB = b.score;
      } else {
        valA = String(a[sortBy] || '').toLowerCase();
        valB = String(b[sortBy] || '').toLowerCase();
      }

      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return sendResponse(res, 200, true, 'Results history retrieved.', resultData);
  } catch (error) {
    next(error);
  }
};
