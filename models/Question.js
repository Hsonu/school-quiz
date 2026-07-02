const BaseModel = require('./BaseModel');

const questionSchema = {
  subjectId: {
    type: String,
    ref: 'Subject',
    required: true
  },
  classId: {
    type: String,
    ref: 'Class',
    required: false
  },
  teacherId: {
    type: String,
    ref: 'Teacher',
    required: true
  },
  questionText: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true
  },
  correctAnswer: {
    type: Number, // Index of correct option (0, 1, 2, 3)
    required: true
  },
  points: {
    type: Number,
    default: 1
  }
};

module.exports = new BaseModel('Question', questionSchema);
