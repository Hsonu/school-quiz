const BaseModel = require('./BaseModel');

const assignmentSchema = {
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
  teacherId: {
    type: String,
    ref: 'Teacher',
    required: true,
    index: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  filePath: {
    type: String,
    default: ''
  }
};

module.exports = new BaseModel('Assignment', assignmentSchema);
