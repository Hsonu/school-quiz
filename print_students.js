require('dotenv').config();
const mongoose = require('mongoose');
const Result = require('./models/Result');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const results = await Result.find({});
  console.log('RESULTS:');
  results.forEach(r => {
    console.log({
      id: r._id,
      studentId: r.studentId,
      studentIdType: typeof r.studentId,
      studentIdConstructor: r.studentId ? r.studentId.constructor.name : 'null',
      quizId: r.quizId,
      examId: r.examId,
      type: r.type
    });
  });
  process.exit(0);
}
test();
