require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

// Connect DB
const connectDB = require('./config/db');

// Models
const Teacher = require('./models/Teacher');
const Student = require('./models/Student');
const Class = require('./models/Class');
const Subject = require('./models/Subject');
const Question = require('./models/Question');
const Quiz = require('./models/Quiz');
const QuizAttempt = require('./models/QuizAttempt');
const Result = require('./models/Result');
const Owner = require('./models/Owner');
const Exam = require('./models/Exam');
const Attendance = require('./models/Attendance');
const Notification = require('./models/Notification');
const Report = require('./models/Report');

// New ERP Models
const Principal = require('./models/Principal');
const College = require('./models/College');
const Department = require('./models/Department');
const Course = require('./models/Course');
const Semester = require('./models/Semester');
const TeacherSubject = require('./models/TeacherSubject');
const Timetable = require('./models/Timetable');
const Marks = require('./models/Marks');
const Assignment = require('./models/Assignment');
const AssignmentSubmission = require('./models/AssignmentSubmission');
const Notes = require('./models/Notes');

const seedData = async () => {
  try {
    console.log('--- Initializing ERP Portal Database Seeder ---');
    await connectDB();

    // Give connection a split second to set up state
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clear existing data (in MongoDB or JSON fallback)
    console.log('Clearing old records...');
    await Teacher.deleteMany({});
    await Student.deleteMany({});
    await Class.deleteMany({});
    await Subject.deleteMany({});
    await Question.deleteMany({});
    await Quiz.deleteMany({});
    await QuizAttempt.deleteMany({});
    await Result.deleteMany({});
    await Owner.deleteMany({});
    await Exam.deleteMany({});
    await Attendance.deleteMany({});
    await Notification.deleteMany({});
    await Report.deleteMany({});

    // Clear new models
    await Principal.deleteMany({});
    await College.deleteMany({});
    await Department.deleteMany({});
    await Course.deleteMany({});
    await Semester.deleteMany({});
    await TeacherSubject.deleteMany({});
    await Timetable.deleteMany({});
    await Marks.deleteMany({});
    await Assignment.deleteMany({});
    await AssignmentSubmission.deleteMany({});
    await Notes.deleteMany({});

    // Hash common password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('123456', salt);

    // Seed Owner
    console.log('Seeding owner accounts...');
    const ownerPasswordHash = await bcrypt.hash('password123', salt);
    const owner = await Owner.create({
      name: 'Nakul Sir',
      email: 'owner@rajcomputer.com',
      password: ownerPasswordHash,
      role: 'owner'
    });
    console.log(`Owner seeded: ${owner.email} (Password: password123)`);

    // Seed College
    console.log('Seeding college settings...');
    const college = await College.create({
      name: 'QUIZGEN  College',
      code: 'RCC-01',
      address: 'Main Commercial Hub, Raj Street',
      contactEmail: 'contact@rajcomputer.com'
    });
    console.log(`College seeded: ${college.name}`);

    // Seed Principal
    console.log('Seeding principal accounts...');
    const principal = await Principal.create({
      name: 'Principal Skinner',
      email: 'principal@rajcomputer.com',
      password: passwordHash,
      collegeId: college._id,
      role: 'principal',
      isActive: true
    });
    console.log(`Principal seeded: ${principal.email} (Password: 123456)`);

    // Seed Department
    console.log('Seeding departments...');
    const dept = await Department.create({
      name: 'Computer Science & Engineering',
      collegeId: college._id
    });
    console.log(`Department seeded: ${dept.name}`);

    // Seed Course
    console.log('Seeding courses...');
    const course = await Course.create({
      name: 'Bachelor of Computer Applications (BCA)',
      departmentId: dept._id,
      durationYears: 3
    });
    console.log(`Course seeded: ${course.name}`);

    // Seed Semester
    console.log('Seeding semesters...');
    const sem1 = await Semester.create({
      name: 'Semester 1 (Fall)',
      courseId: course._id
    });
    const sem2 = await Semester.create({
      name: 'Semester 2 (Spring)',
      courseId: course._id
    });
    console.log(`Semesters seeded: ${sem1.name}, ${sem2.name}`);

    // Seed Subject (linked to department, course, semester)
    console.log('Seeding subjects...');
    const mathSub = await Subject.create({
      name: 'Discrete Mathematics',
      departmentId: dept._id,
      courseId: course._id,
      semesterId: sem1._id
    });
    const dsSub = await Subject.create({
      name: 'Data Structures',
      departmentId: dept._id,
      courseId: course._id,
      semesterId: sem1._id
    });
    const webSub = await Subject.create({
      name: 'Web Development',
      departmentId: dept._id,
      courseId: course._id,
      semesterId: sem2._id
    });
    console.log(`Subjects seeded: ${mathSub.name}, ${dsSub.name}, ${webSub.name}`);

    // Seed Teacher
    console.log('Seeding teacher accounts...');
    const teacher = await Teacher.create({
      name: 'Prof. Charles Xavier',
      email: 'teacher@rajcomputer.com',
      password: passwordHash,
      designation: 'Professor of Genetics & Algorithms',
      departmentId: dept._id,
      profilePic: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop',
      isActive: true
    });
    console.log(`Teacher seeded: ${teacher.email} (Password: 123456)`);

    // Map Teacher to Subjects
    console.log('Seeding teacher-subject maps...');
    await TeacherSubject.create({
      teacherId: teacher._id,
      subjectId: dsSub._id
    });
    await TeacherSubject.create({
      teacherId: teacher._id,
      subjectId: webSub._id
    });
    console.log(`Mapped teacher to ${dsSub.name} & ${webSub.name}`);

    // Seed Timetable Slot
    console.log('Seeding timetable scheduling slots...');
    const slot = await Timetable.create({
      subjectId: dsSub._id,
      teacherId: teacher._id,
      semesterId: sem1._id,
      day: 'Monday',
      startTime: '09:00 AM',
      endTime: '10:00 AM',
      room: 'Room 402'
    });
    console.log(`Timetable scheduled: ${dsSub.name} on ${slot.day} in ${slot.room}`);

    // Seed Student
    console.log('Seeding student accounts...');
    const student = await Student.create({
      name: 'Peter Parker',
      email: 'student@rajcomputer.com',
      password: passwordHash,
      departmentId: dept._id,
      courseId: course._id,
      semesterId: sem1._id,
      rollNo: 'RC-2026-007',
      profilePic: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=150&auto=format&fit=crop',
      isActive: true
    });
    console.log(`Student seeded: ${student.email} (Password: 123456, Roll: ${student.rollNo})`);

    // Seed Questions for DS and Web
    console.log('Seeding question bank...');
    const q1 = await Question.create({
      subjectId: dsSub._id,
      teacherId: teacher._id,
      questionText: 'Which data structure follows the Last-In-First-Out (LIFO) principle?',
      options: ['Queue', 'Stack', 'Tree', 'Array'],
      correctAnswer: 1,
      points: 2
    });
    const q2 = await Question.create({
      subjectId: dsSub._id,
      teacherId: teacher._id,
      questionText: 'What is the average time complexity of searching in a Hash Table?',
      options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
      correctAnswer: 0,
      points: 3
    });
    console.log(`Questions seeded for ${dsSub.name}`);

    // Seed Quiz
    console.log('Seeding classroom quiz Assessments...');
    const quizObj = await Quiz.create({
      title: 'Data Structures Midterm Quiz',
      description: 'LIFO stack models and linear queue arrays.',
      subjectId: dsSub._id,
      classId: 'default',
      teacherId: teacher._id,
      questions: [q1._id, q2._id],
      duration: 15,
      totalMarks: 5
    });
    console.log(`Quiz seeded: ${quizObj.title}`);

    // Seed Attempt & Quiz Result
    console.log('Seeding sample student attempt and results records...');
    const attempt = await QuizAttempt.create({
      quizId: quizObj._id,
      studentId: student._id,
      answers: [
        { questionId: q1._id, selectedAnswer: 1, isCorrect: true },
        { questionId: q2._id, selectedAnswer: 1, isCorrect: false }
      ],
      score: 2,
      totalQuestions: 2,
      timeTaken: 120,
      completedAt: new Date()
    });

    await Result.create({
      attemptId: attempt._id,
      studentId: student._id,
      quizId: quizObj._id,
      score: 2,
      totalMarks: 5,
      percentage: 40,
      status: 'Fail',
      type: 'quiz'
    });

    // Seed Attendance
    console.log('Seeding attendance sheets...');
    const days = [1, 2, 3, 4, 5];
    for (const day of days) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(12, 0, 0, 0);
      await Attendance.create({
        studentId: student._id,
        classId: 'default',
        date: date,
        status: day === 3 ? 'Absent' : 'Present'
      });
    }

    // Seed Notification
    console.log('Seeding announcements notifications...');
    await Notification.create({
      title: 'ERP Portal Initialization',
      message: 'Welcome to QUIZGEN  College ERP system.',
      recipientRole: 'all',
      senderId: owner._id,
      senderRole: 'owner'
    });

    console.log('==================================================');
    console.log('Success: ERP Database Seeding Finished!');
    console.log('To start, run: npm start');
    console.log('==================================================');

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Error during data seeding:', error);
    process.exit(1);
  }
};

seedData();
