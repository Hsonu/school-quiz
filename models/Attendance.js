const BaseModel = require('./BaseModel');

const attendanceSchema = {
  studentId: {
    type: String,
    ref: 'Student',
    required: true,
    index: true
  },
  classId: {
    type: String,
    ref: 'Class',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Present'
  }
};

module.exports = new BaseModel('Attendance', attendanceSchema);
