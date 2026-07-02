const BaseModel = require('./BaseModel');

const principalSchema = {
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
  collegeId: {
    type: String,
    ref: 'College'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    default: 'principal'
  },
  designation: {
    type: String,
    default: 'Principal'
  },
  profilePic: {
    type: String,
    default: ''
  }
};

module.exports = new BaseModel('Principal', principalSchema);
