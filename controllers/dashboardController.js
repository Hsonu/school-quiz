const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Question = require('../models/Question');
const Student = require('../models/Student');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Result = require('../models/Result');
const sendResponse = require('../utils/response');

exports.getTeacherDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const TeacherSubject = require('../models/TeacherSubject');

    // Fetch assigned subjects
    const mappings = await TeacherSubject.find({ teacherId });
    const subjectIds = mappings.map(m => m.subjectId);
    const subjects = await Subject.find({ _id: { $in: subjectIds } });
    const subjectCount = subjects.length;

    // Unique courses/semesters teacher is teaching
    const semIds = [...new Set(subjects.map(s => String(s.semesterId)))];

    const questions = await Question.find({ teacherId });
    const questionCount = questions.length;

    const quizzes = await Quiz.find({ teacherId });
    const quizCount = quizzes.length;
    const quizIds = quizzes.map(q => String(q._id));

    // Students enrolled in the teacher's semester placements
    const enrolledStudents = await Student.find({ semesterId: { $in: semIds } });
    const enrolledStudentsMap = new Map(enrolledStudents.map(s => [String(s._id), s]));
    const studentCount = enrolledStudents.length;

    // Recent Quiz attempts
    const filteredResults = await Result.find({ quizId: { $in: quizIds } });
    
    // Sort and take top 5
    const recentActivity = [];
    const sortedResults = [...filteredResults].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
    
    // Fetch any missing students and quizzes in batch first
    const missingStudentIds = [...new Set(sortedResults
      .map(r => r.studentId)
      .filter(sid => !enrolledStudentsMap.has(String(sid))))];
    const missingQuizIds = [...new Set(sortedResults
      .map(r => r.quizId)
      .filter(qid => !quizzes.some(q => String(q._id) === String(qid))))];

    const [missingStudents, missingQuizzes] = await Promise.all([
      Student.find({ _id: { $in: missingStudentIds } }),
      Quiz.find({ _id: { $in: missingQuizIds } })
    ]);

    const allStudentsMap = new Map([
      ...enrolledStudents.map(s => [String(s._id), s]),
      ...missingStudents.map(s => [String(s._id), s])
    ]);
    const allQuizzesMap = new Map([
      ...quizzes.map(q => [String(q._id), q]),
      ...missingQuizzes.map(q => [String(q._id), q])
    ]);

    for (const r of sortedResults) {
      const student = allStudentsMap.get(String(r.studentId));
      const quiz = allQuizzesMap.get(String(r.quizId));
      recentActivity.push({
        id: r._id,
        studentName: student ? student.name : 'Unknown Student',
        quizTitle: quiz ? quiz.title : 'Deleted Quiz',
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        status: r.status,
        date: r.createdAt
      });
    }

    // Chart Data 1: Quiz average performance
    const quizPerformanceDataset = [];
    for (const q of quizzes) {
      const attempts = filteredResults.filter(r => String(r.quizId) === String(q._id));
      if (attempts.length > 0) {
        const sum = attempts.reduce((acc, curr) => acc + curr.percentage, 0);
        const avg = Math.round(sum / attempts.length);
        quizPerformanceDataset.push({
          quizTitle: q.title,
          averagePercentage: avg,
          attemptsCount: attempts.length
        });
      }
    }

    // Chart Data 2: Grade distribution
    const grades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    filteredResults.forEach(r => {
      const p = r.percentage;
      if (p >= 90) grades.A++;
      else if (p >= 80) grades.B++;
      else if (p >= 70) grades.C++;
      else if (p >= 50) grades.D++;
      else grades.F++;
    });

    const stats = {
      classCount: semIds.length,
      subjectCount,
      questionCount,
      quizCount,
      studentCount,
      recentActivity,
      charts: {
        quizPerformance: quizPerformanceDataset,
        gradeDistribution: [
          { grade: 'A (90%+)', count: grades.A },
          { grade: 'B (80-89%)', count: grades.B },
          { grade: 'C (70-79%)', count: grades.C },
          { grade: 'D (50-69%)', count: grades.D },
          { grade: 'F (<50%)', count: grades.F }
        ]
      }
    };

    return sendResponse(res, 200, true, 'Teacher dashboard stats loaded.', stats);
  } catch (error) {
    next(error);
  }
};

exports.getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const student = await Student.findById(studentId);
    if (!student) {
      return sendResponse(res, 404, false, 'Student not found.');
    }

    // Target Class Details
    const targetClass = await Class.findById(student.classId);

    // Subject count
    const subjects = await Subject.find({ classId: student.classId });
    const subjectCount = subjects.length;

    // Total quizzes for class
    const quizzes = await Quiz.find({ classId: student.classId });
    const totalQuizzes = quizzes.length;

    // Completed quizzes
    const results = await Result.find({ studentId });
    const completedQuizzes = results.length;

    // Pre-fetch all quizzes and subjects associated with the student's results in batch
    const attemptedQuizIds = [...new Set(results.map(r => r.quizId).filter(Boolean))];
    const allAttemptedQuizzes = await Quiz.find({ _id: { $in: attemptedQuizIds } });
    const quizzesMap = new Map(allAttemptedQuizzes.map(q => [String(q._id), q]));

    const subjectIds = [...new Set(allAttemptedQuizzes.map(q => q.subjectId).filter(Boolean))];
    const allSubjects = await Subject.find({ _id: { $in: subjectIds } });
    const subjectsMap = new Map(allSubjects.map(s => [String(s._id), s]));

    // Pending quizzes (available but not attempted)
    const pendingQuizzes = quizzes.filter(q => !attemptedQuizIds.map(String).includes(String(q._id))).length;

    // Average Marks
    const averageScore = results.length > 0
      ? Math.round(results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length)
      : 0;

    // Recent Quiz attempts
    const recentQuizzes = [];
    const sortedResults = [...results].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

    for (const r of sortedResults) {
      const quiz = quizzesMap.get(String(r.quizId));
      const sub = quiz ? subjectsMap.get(String(quiz.subjectId)) : null;
      recentQuizzes.push({
        id: r._id,
        quizTitle: quiz ? quiz.title : 'Deleted Quiz',
        subjectName: sub ? sub.name : 'Unknown Subject',
        score: r.score,
        totalMarks: r.totalMarks,
        percentage: r.percentage,
        status: r.status,
        date: r.createdAt
      });
    }

    // Chart Data: Marks over time (progression)
    const sortedResultsOldest = [...results].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const progression = [];
    for (const r of sortedResultsOldest) {
      const quiz = quizzesMap.get(String(r.quizId));
      progression.push({
        quizTitle: quiz ? quiz.title : 'Quiz',
        percentage: r.percentage,
        date: new Date(r.createdAt).toLocaleDateString()
      });
    }

    const stats = {
      className: targetClass ? targetClass.name : 'Unknown Class',
      rollNo: student.rollNo,
      subjectCount,
      totalQuizzes,
      completedQuizzes,
      pendingQuizzes,
      averageScore,
      recentQuizzes,
      charts: {
        progression
      }
    };

    return sendResponse(res, 200, true, 'Student dashboard stats loaded.', stats);
  } catch (error) {
    next(error);
  }
};
