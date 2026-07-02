const BaseModel = require('./BaseModel');

const quizAttemptSchema = {
  quizId: {
    type: String,
    ref: 'Quiz',
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
      selectedAnswer: { type: Number, required: true }, // Index of the option selected
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
    type: Number, // Time taken in seconds
    required: true
  },
  completedAt: {
    type: Date,
    default: Date.now
  }
};

module.exports = new BaseModel('QuizAttempt', quizAttemptSchema);
