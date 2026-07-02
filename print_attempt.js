require('dotenv').config();
const mongoose = require('mongoose');
const Question = require('./models/Question');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const questions = await Question.find({});
  console.log('Total questions in DB:', questions.length);
  questions.forEach(q => console.log({ id: q._id, text: q.questionText }));

  process.exit(0);
}
test();
