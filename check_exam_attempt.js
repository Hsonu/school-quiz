require('dotenv').config();
const mongoose = require('mongoose');
const Result = require('./models/Result');
const ExamAttempt = require('./models/ExamAttempt');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const r = await Result.findById('6a40f008e45539c8de88600e');
  console.log('Result document:', r);
  if (r) {
    console.log('attemptId type:', typeof r.attemptId, 'val:', r.attemptId);
    const attempt = await ExamAttempt.findById(r.attemptId);
    console.log('ExamAttempt found directly:', attempt);

    // Let's search all exam attempts in the database
    const allAttempts = await ExamAttempt.find({});
    console.log('All ExamAttempts count:', allAttempts.length);
    allAttempts.forEach(att => {
      console.log({ id: att._id, studentId: att.studentId, examId: att.examId, score: att.score });
    });
  }
  process.exit(0);
}
test();
