const BaseModel = require('./BaseModel');

const submissionSchema = {
  assignmentId: {
    type: String,
    ref: 'Assignment',
    required: true,
    index: true
  },
  studentId: {
    type: String,
    ref: 'Student',
    required: true,
    index: true
  },
  filePath: {
    type: String,
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Pending', 'Graded'],
    default: 'Pending'
  },
  marks: {
    type: Number,
    default: 0
  },
  feedback: {
    type: String,
    default: ''
  }
};

module.exports = new BaseModel('AssignmentSubmission', submissionSchema);
