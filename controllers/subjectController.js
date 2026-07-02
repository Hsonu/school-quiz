const Subject = require('../models/Subject');
const Class = require('../models/Class');
const Student = require('../models/Student');
const sendResponse = require('../utils/response');

exports.getSubjects = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.classId) {
      query.classId = req.query.classId;
    } else if (req.user.role === 'student') {
      const student = await Student.findById(req.user.id);
      if (student) {
        query.classId = student.classId;
      }
    }
    
    const subjects = await Subject.find(query);
    
    // Populating class names and teacher names manually in batch
    const Teacher = require('../models/Teacher');
    const classIds = [...new Set(subjects.map(s => s.classId).filter(Boolean))];
    const teacherIds = [...new Set(subjects.map(s => s.teacherId).filter(Boolean))];

    const [classes, teachers] = await Promise.all([
      Class.find({ _id: { $in: classIds } }),
      Teacher.find({ _id: { $in: teacherIds } })
    ]);

    const classesMap = new Map(classes.map(c => [String(c._id), c]));
    const teachersMap = new Map(teachers.map(t => [String(t._id), t]));

    const populatedSubjects = [];
    for (const sub of subjects) {
      const cls = classesMap.get(String(sub.classId));
      const teacher = teachersMap.get(String(sub.teacherId));
      populatedSubjects.push({
        id: sub._id,
        name: sub.name,
        classId: sub.classId,
        className: cls ? cls.name : 'Unknown Class',
        teacherId: sub.teacherId,
        teacherName: teacher ? teacher.name : 'System Admin'
      });
    }

    return sendResponse(res, 200, true, 'Subjects retrieved successfully.', populatedSubjects);
  } catch (error) {
    next(error);
  }
};

