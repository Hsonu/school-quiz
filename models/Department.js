const BaseModel = require('./BaseModel');

const departmentSchema = {
  name: {
    type: String,
    required: true
  },
  collegeId: {
    type: String,
    ref: 'College'
  }
};

module.exports = new BaseModel('Department', departmentSchema);
