const BaseModel = require('./BaseModel');

const subjectSchema = {
  name: {
    type: String,
    required: true
  },
  classId: {
    type: String,
    ref: 'Class',
    index: true
  },
  teacherId: {
    type: String,
    ref: 'Teacher',
    index: true
  },
  departmentId: {
    type: String,
    ref: 'Department',
    index: true
  },
  courseId: {
    type: String,
    ref: 'Course',
    index: true
  },
  semesterId: {
    type: String,
    ref: 'Semester',
    index: true
  }
};

module.exports = new BaseModel('Subject', subjectSchema);
