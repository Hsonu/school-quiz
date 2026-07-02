const BaseModel = require('./BaseModel');

const resultSchema = {
  attemptId: {
    type: String,
    ref: 'QuizAttempt',
    required: true,
    index: true
  },
  studentId: {
    type: String,
    ref: 'Student',
    required: true,
    index: true
  },
  quizId: {
    type: String,
    ref: 'Quiz',
    required: false,
    index: true
  },
  examId: {
    type: String,
    ref: 'Exam',
    required: false,
    index: true
  },
  type: {
    type: String,
    enum: ['quiz', 'exam'],
    default: 'quiz'
  },
  score: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  status: {
    type: String, // 'Pass' or 'Fail'
    required: true
  }
};

module.exports = new BaseModel('Result', resultSchema);
