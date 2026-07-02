const BaseModel = require('./BaseModel');

const timetableSchema = {
  subjectId: {
    type: String,
    ref: 'Subject',
    required: true
  },
  teacherId: {
    type: String,
    ref: 'Teacher',
    required: true
  },
  day: {
    type: String,
    required: true
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  room: {
    type: String,
    default: ''
  },
  semesterId: {
    type: String,
    ref: 'Semester'
  }
};

module.exports = new BaseModel('Timetable', timetableSchema);
