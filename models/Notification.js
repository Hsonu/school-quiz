const BaseModel = require('./BaseModel');

const notificationSchema = {
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  recipientRole: {
    type: String, // 'all', 'teacher', 'student'
    default: 'all'
  },
  senderId: {
    type: String,
    required: true
  },
  senderRole: {
    type: String, // 'owner', 'teacher'
    required: true
  }
};

module.exports = new BaseModel('Notification', notificationSchema);
