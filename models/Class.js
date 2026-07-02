const BaseModel = require('./BaseModel');

const classSchema = {
  name: {
    type: String,
    required: true,
    unique: true
  },
  teacherId: {
    type: String,
    ref: 'Teacher',
    required: true
  }
};

module.exports = new BaseModel('Class', classSchema);
