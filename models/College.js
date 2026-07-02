const BaseModel = require('./BaseModel');

const collegeSchema = {
  name: {
    type: String,
    required: true
  },
  code: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    default: ''
  },
  settings: {
    type: Object,
    default: {}
  }
};

module.exports = new BaseModel('College', collegeSchema);
