const Class = require('../models/Class');
const Student = require('../models/Student');
const sendResponse = require('../utils/response');

exports.getClasses = async (req, res, next) => {
  try {
    // Get all classes for everyone as requested by the user
    const classes = await Class.find({});
    
    // Populate teacher names in batch
    const Teacher = require('../models/Teacher');
    const teacherIds = [...new Set(classes.map(cls => cls.teacherId).filter(Boolean))];
    const teachers = await Teacher.find({ _id: { $in: teacherIds } });
    const teachersMap = new Map(teachers.map(t => [String(t._id), t]));

    const populated = [];
    for (const cls of classes) {
      const teacher = teachersMap.get(String(cls.teacherId));
      populated.push({
        _id: cls._id,
        name: cls.name,
        teacherId: cls.teacherId,
        teacherName: teacher ? teacher.name : 'System Admin',
        createdAt: cls.createdAt
      });
    }
    
    return sendResponse(res, 200, true, 'Classes retrieved successfully.', populated);
  } catch (error) {
    next(error);
  }
};

exports.getClassById = async (req, res, next) => {
  try {
    const classId = req.params.id;
    const targetClass = await Class.findById(classId);
    
    if (!targetClass) {
      return sendResponse(res, 404, false, 'Class not found.');
    }

    return sendResponse(res, 200, true, 'Class details retrieved.', targetClass);
  } catch (error) {
    next(error);
  }
};

exports.createClass = async (req, res, next) => {
  try {
    const { name, teacherId } = req.body;
    if (!name || !teacherId) {
      return sendResponse(res, 400, false, 'Class name and Teacher are required.');
    }

    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return sendResponse(res, 400, false, 'Class name already exists.');
    }

    const newClass = await Class.create({ name, teacherId });
    return sendResponse(res, 201, true, 'Class created successfully.', newClass);
  } catch (error) {
    next(error);
  }
};

exports.deleteClass = async (req, res, next) => {
  try {
    const classId = req.params.id;
    const targetClass = await Class.findById(classId);
    if (!targetClass) {
      return sendResponse(res, 404, false, 'Class not found.');
    }

    await Class.findByIdAndDelete(classId);
    return sendResponse(res, 200, true, 'Class deleted successfully.');
  } catch (error) {
    next(error);
  }
};

