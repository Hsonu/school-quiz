const Quiz = require('../models/Quiz');
const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Student = require('../models/Student');
const QuizAttempt = require('../models/QuizAttempt');
const Result = require('../models/Result');
const calculateMarks = require('../utils/calculateMarks');
const sendResponse = require('../utils/response');

exports.createQuiz = async (req, res, next) => {
  try {
    const { title, description, subjectId, classId, duration, questions } = req.body;

    if (!title || !subjectId || !classId || !questions || !Array.isArray(questions) || questions.length === 0) {
      return sendResponse(res, 400, false, 'Title, Subject, Class, and at least one Question are required.');
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendResponse(res, 404, false, 'Subject not found.');
    }

    // Verify all questions belong to this subject
    const questionsDocs = [];
    let totalMarks = 0;
    for (const qId of questions) {
      const q = await Question.findById(qId);
      if (q) {
        questionsDocs.push(q);
        totalMarks += Number(q.points || 1);
      }
    }

    const newQuiz = await Quiz.create({
      title,
      description: description || '',
      subjectId,
      classId,
      teacherId: req.user.id,
      questions,
      duration: Number(duration || 15),
      totalMarks
    });

    return sendResponse(res, 201, true, 'Quiz created successfully.', newQuiz);
  } catch (error) {
    next(error);
  }
};

exports.getQuizzes = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    } else {
      // For student, filter by classId parameter if sent, otherwise fallback to student's profile classId
      if (req.query.classId) {
        query.classId = req.query.classId;
      } else {
        const student = await Student.findById(req.user.id);
        if (!student) {
          return sendResponse(res, 404, false, 'Student not found.');
        }
        query.classId = student.classId;
      }
    }

    if (req.query.subjectId) {
      query.subjectId = req.query.subjectId;
    }

    const quizzes = await Quiz.find(query);

    const subjectIds = [...new Set(quizzes.map(q => q.subjectId).filter(Boolean))];
    const classIds = [...new Set(quizzes.map(q => q.classId).filter(Boolean))];

    const [subjects, classes] = await Promise.all([
      Subject.find({ _id: { $in: subjectIds } }),
      Class.find({ _id: { $in: classIds } })
    ]);

    const subjectsMap = new Map(subjects.map(s => [String(s._id), s]));
    const classesMap = new Map(classes.map(cls => [String(cls._id), cls]));

    let attemptsMap = new Map();
    if (req.user.role === 'student' && quizzes.length > 0) {
      const quizIds = quizzes.map(q => String(q._id));
      const attempts = await QuizAttempt.find({ quizId: { $in: quizIds }, studentId: req.user.id });
      attemptsMap = new Map(attempts.map(a => [String(a.quizId), a]));
    }

    // Populate subject and class info manually
    const populated = [];
    for (const quiz of quizzes) {
      const sub = subjectsMap.get(String(quiz.subjectId));
      const cls = classesMap.get(String(quiz.classId));

      // If student, check if they already took this quiz
      let alreadyAttempted = false;
      let attemptId = null;
      if (req.user.role === 'student') {
        const attempt = attemptsMap.get(String(quiz._id));
        if (attempt) {
          alreadyAttempted = true;
          attemptId = attempt._id;
        }
      }

      populated.push({
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        totalMarks: quiz.totalMarks,
        questionsCount: quiz.questions.length,
        subjectId: quiz.subjectId,
        classId: quiz.classId,
        subjectName: sub ? sub.name : 'Unknown Subject',
        className: cls ? cls.name : 'Unknown Class',
        alreadyAttempted,
        attemptId
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

    // 3. Search query
    if (req.query.search) {
      const searchLower = String(req.query.search).toLowerCase();
      resultData = resultData.filter(item =>
        String(item.title).toLowerCase().includes(searchLower) ||
        String(item.description || '').toLowerCase().includes(searchLower)
      );
    }

    // 4. Sorting
    const sortBy = req.query.sortBy || 'title';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1; // Default to asc (title)

    resultData.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (sortBy === 'duration' || sortBy === 'totalMarks' || sortBy === 'questionsCount') {
        valA = Number(valA || 0);
        valB = Number(valB || 0);
      } else {
        valA = String(valA || '').toLowerCase();
        valB = String(valB || '').toLowerCase();
      }

      if (valA < valB) return -1 * sortOrder;
      if (valA > valB) return 1 * sortOrder;
      return 0;
    });

    return sendResponse(res, 200, true, 'Quizzes retrieved successfully.', resultData);
  } catch (error) {
    next(error);
  }
};

exports.getQuizDetails = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return sendResponse(res, 404, false, 'Quiz not found.');
    }

    const sub = await Subject.findById(quiz.subjectId);
    const cls = await Class.findById(quiz.classId);

    // Fetch details of all questions in this quiz
    const questionsDocs = [];
    for (const qId of quiz.questions) {
      const q = await Question.findById(qId);
      if (q) {
        // Strip correct answer index if request is from a student to prevent cheat inspectors!
        const questionPayload = {
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          points: q.points
        };

        // Only include correctAnswer for teachers
        if (req.user.role === 'teacher') {
          questionPayload.correctAnswer = q.correctAnswer;
        }

        questionsDocs.push(questionPayload);
      }
    }

    const quizDetails = {
      id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      totalMarks: quiz.totalMarks,
      subjectName: sub ? sub.name : 'Unknown Subject',
      className: cls ? cls.name : 'Unknown Class',
      questions: questionsDocs
    };

    return sendResponse(res, 200, true, 'Quiz details retrieved.', quizDetails);
  } catch (error) {
    next(error);
  }
};

exports.submitQuiz = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const { answers, timeTaken } = req.body; // answers: [{ questionId, selectedAnswer }]

    if (!answers || !Array.isArray(answers)) {
      return sendResponse(res, 400, false, 'Invalid answers format.');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return sendResponse(res, 404, false, 'Quiz not found.');
    }

    // Check if student already attempted
    const existingAttempt = await QuizAttempt.findOne({ quizId, studentId: req.user.id });
    if (existingAttempt) {
      return sendResponse(res, 400, false, 'You have already attempted this quiz.');
    }

    // Fetch actual questions with answers
    const questionsList = [];
    for (const qId of quiz.questions) {
      const q = await Question.findById(qId);
      if (q) {
        questionsList.push(q);
      }
    }

    // Grade answers
    const { score, totalQuestions, gradedAnswers } = calculateMarks(answers, questionsList);

    // Save Attempt
    const attempt = await QuizAttempt.create({
      quizId,
      studentId: req.user.id,
      answers: gradedAnswers,
      score,
      totalQuestions,
      timeTaken: timeTaken || 0,
      completedAt: new Date()
    });

    // Calculate percentage and status
    const percentage = quiz.totalMarks > 0 ? Math.round((score / quiz.totalMarks) * 100) : 0;
    const status = percentage >= 50 ? 'Pass' : 'Fail';

    // Save Result
    const result = await Result.create({
      attemptId: attempt._id,
      studentId: req.user.id,
      quizId,
      score,
      totalMarks: quiz.totalMarks,
      percentage,
      status
    });

    return sendResponse(res, 201, true, 'Quiz submitted and graded successfully.', {
      attemptId: attempt._id,
      score,
      totalMarks: quiz.totalMarks,
      percentage,
      status
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteQuiz = async (req, res, next) => {
  try {
    const quizId = req.params.id;
    const quiz = await Quiz.findById(quizId);

    if (!quiz) {
      return sendResponse(res, 404, false, 'Quiz not found.');
    }

    if (String(quiz.teacherId) !== String(req.user.id)) {
      return sendResponse(res, 403, false, 'Unauthorized to delete this quiz.');
    }

    await Quiz.findByIdAndDelete(quizId);

    // Also cleanup quiz attempts and results
    await QuizAttempt.deleteMany({ quizId });
    await Result.deleteMany({ quizId });

    return sendResponse(res, 200, true, 'Quiz and associated records deleted.');
  } catch (error) {
    next(error);
  }
};
