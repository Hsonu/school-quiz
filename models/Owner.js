const BaseModel = require('./BaseModel');

const ownerSchema = {
  name: {
    type: String,
    required: true,
    default: 'Nakul Sir'
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
  role: {
    type: String,
    default: 'owner'
  },
  profilePic: {
    type: String,
    default: ''
  }
};

module.exports = new BaseModel('Owner', ownerSchema);
