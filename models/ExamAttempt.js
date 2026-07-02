const BaseModel = require('./BaseModel');

const examAttemptSchema = {
  examId: {
    type: String,
    ref: 'Exam',
    required: true
  },
  studentId: {
    type: String,
    ref: 'Student',
    required: true
  },
  answers: [
    {
      questionId: { type: String, required: true },
      selectedAnswer: { type: Number, required: true },
      isCorrect: { type: Boolean, required: true }
    }
  ],
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  timeTaken: {
    type: Number, // In seconds
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
};

module.exports = new BaseModel('ExamAttempt', examAttemptSchema);
