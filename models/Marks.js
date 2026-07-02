const BaseModel = require('./BaseModel');

const marksSchema = {
  studentId: {
    type: String,
    ref: 'Student',
    required: true,
    index: true
  },
  subjectId: {
    type: String,
    ref: 'Subject',
    required: true,
    index: true
  },
  assessmentId: {
    type: String, // Exam or Quiz ID
    required: true
  },
  assessmentType: {
    type: String, // 'quiz' or 'exam'
    enum: ['quiz', 'exam'],
    default: 'quiz'
  },
  marksObtained: {
    type: Number,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true
  }
};

module.exports = new BaseModel('Marks', marksSchema);
