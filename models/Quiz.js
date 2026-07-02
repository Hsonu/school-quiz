const BaseModel = require('./BaseModel');

const quizSchema = {
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  subjectId: {
    type: String,
    ref: 'Subject',
    required: true,
    index: true
  },
  classId: {
    type: String,
    ref: 'Class',
    required: true,
    index: true
  },
  teacherId: {
    type: String,
    ref: 'Teacher',
    required: true,
    index: true
  },
  questions: {
    type: [String], // Array of Question IDs
    default: []
  },
  duration: {
    type: Number, // In minutes
    default: 15
  },
  totalMarks: {
    type: Number,
    default: 0
  }
};

module.exports = new BaseModel('Quiz', quizSchema);
