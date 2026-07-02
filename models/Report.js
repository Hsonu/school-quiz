const BaseModel = require('./BaseModel');

const reportSchema = {
  title: {
    type: String,
    required: true
  },
  type: {
    type: String, // 'attendance', 'result', 'quiz', 'exam'
    required: true
  },
  filters: {
    type: Object,
    default: {}
  },
  generatedBy: {
    type: String,
    required: true
  },
  data: {
    type: Array,
    default: []
  }
};

module.exports = new BaseModel('Report', reportSchema);
