const BaseModel = require('./BaseModel');

const teacherSubjectSchema = {
  teacherId: {
    type: String,
    ref: 'Teacher',
    required: true,
    index: true
  },
  subjectId: {
    type: String,
    ref: 'Subject',
    required: true,
    index: true
  }
};

module.exports = new BaseModel('TeacherSubject', teacherSubjectSchema);
