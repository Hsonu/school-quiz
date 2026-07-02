const BaseModel = require('./BaseModel');

const subjectSchema = {
  name: {
    type: String,
    required: true
  },
  departmentId: {
    type: String,
    ref: 'Department',
    required: true,
    index: true
  },
  courseId: {
    type: String,
    ref: 'Course',
    required: true,
    index: true
  },
  semesterId: {
    type: String,
    ref: 'Semester',
    required: true,
    index: true
  },
  classId: {
    type: String,
    ref: 'Class',
    required: false,
    index: true
  }
};

module.exports = new BaseModel('Subject', subjectSchema);
