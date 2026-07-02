const BaseModel = require('./BaseModel');

const semesterSchema = {
  name: {
    type: String,
    required: true
  },
  courseId: {
    type: String,
    ref: 'Course',
    required: true
  }
};

module.exports = new BaseModel('Semester', semesterSchema);
