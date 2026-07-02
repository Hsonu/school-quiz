const BaseModel = require('./BaseModel');

const studentSchema = {
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  profilePic: {
    type: String,
    default: ''
  },
  classId: {
    type: String,
    ref: 'Class'
  },
  departmentId: {
    type: String,
    ref: 'Department'
  },
  courseId: {
    type: String,
    ref: 'Course'
  },
  semesterId: {
    type: String,
    ref: 'Semester'
  },
  rollNo: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
};

module.exports = new BaseModel('Student', studentSchema);
