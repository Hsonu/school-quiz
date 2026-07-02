const BaseModel = require('./BaseModel');

const notesSchema = {
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
  filePath: {
    type: String,
    required: true
  }
};

module.exports = new BaseModel('Notes', notesSchema);
