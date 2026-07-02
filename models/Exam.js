const BaseModel = require('./BaseModel');

const examSchema = {
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
    default: 120
  },
  totalMarks: {
    type: Number,
    default: 100
  },
  passMarks: {
    type: Number,
    default: 40
  },
  failMarks: {
    type: Number,
    default: 39
  },
  examDate: {
    type: Date,
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false
  }
};

module.exports = new BaseModel('Exam', examSchema);
