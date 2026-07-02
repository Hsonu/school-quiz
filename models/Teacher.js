const BaseModel = require('./BaseModel');

const teacherSchema = {
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
  designation: {
    type: String,
    default: 'Senior Lecturer'
  },
  departmentId: {
    type: String,
    ref: 'Department'
  },
  isActive: {
    type: Boolean,
    default: true
  }
};

module.exports = new BaseModel('Teacher', teacherSchema);
