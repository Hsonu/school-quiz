require('dotenv').config();
const mongoose = require('mongoose');

const TeacherSubject = require('./models/TeacherSubject');
const Subject = require('./models/Subject');

async function testQuery() {
  const connUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  try {
    await mongoose.connect(connUri);
    console.log('Mongoose connected.');

    // Simulated req.user.id from the logged-in teacher "Sonu"  
    const teacherId = '6a40c5b0fd58313dab5f8ef9';
    console.log(`\nSimulating query for teacherId: '${teacherId}'`);

    // Let's run the exact model query
    const mappings = await TeacherSubject.find({ teacherId: teacherId });
    console.log('Query result count:', mappings.length);
    console.log('Mappings:', mappings);

    // Let's check what properties exist in a mapping record
    if (mappings.length > 0) {
      const m = mappings[0];
      console.log('teacherId value type in JS:', typeof m.teacherId);
      console.log('teacherId value:', m.teacherId);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

testQuery();
