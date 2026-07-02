require('dotenv').config();
const mongoose = require('mongoose');
const Result = require('./models/Result');
const Quiz = require('./models/Quiz');
const Student = require('./models/Student');
const QuizAttempt = require('./models/QuizAttempt');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  const result = await Result.findById('6a40c5b0fd58313dab5f8f0d');
  console.log('Result:', result);

  if (result) {
    const student = await Student.findById(result.studentId);
    console.log('Student:', student ? student.name : 'Not Found');

    const quiz = await Quiz.findById(result.quizId);
    console.log('Quiz:', quiz ? quiz.title : 'Not Found');

    const attempt = await QuizAttempt.findById(result.attemptId);
    console.log('Attempt:', attempt ? { id: attempt._id, answersCount: attempt.answers.length } : 'Not Found');
  }

  process.exit(0);
}
test();
