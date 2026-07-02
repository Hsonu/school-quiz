const BaseModel = require('./BaseModel');

const courseSchema = {
  name: {
    type: String,
    required: true
  },
  departmentId: {
    type: String,
    ref: 'Department',
    required: true
  },
  durationYears: {
    type: Number,
    default: 3
  }
};

module.exports = new BaseModel('Course', courseSchema);
