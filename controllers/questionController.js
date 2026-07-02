const Question = require('../models/Question');
const Subject = require('../models/Subject');
const Class = require('../models/Class');
const sendResponse = require('../utils/response');

exports.createQuestion = async (req, res, next) => {
  try {
    const { subjectId, classId, questionText, options, correctAnswer, points } = req.body;

    if (!subjectId || !questionText || !options || correctAnswer === undefined) {
      return sendResponse(res, 400, false, 'Please fill in all required fields.');
    }

    if (!Array.isArray(options) || options.length < 2) {
      return sendResponse(res, 400, false, 'At least 2 options are required.');
    }

    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return sendResponse(res, 404, false, 'Subject not found.');
    }

    const newQuestion = await Question.create({
      subjectId,
      classId: classId || null,
      teacherId: req.user.id,
      questionText,
      options,
      correctAnswer: Number(correctAnswer),
      points: Number(points || 1)
    });

    return sendResponse(res, 201, true, 'Question added successfully to question bank.', newQuestion);
  } catch (error) {
    next(error);
  }
};

exports.getQuestions = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'teacher') {
      query.teacherId = req.user.id;
    }
    
    if (req.query.subjectId) {
      query.subjectId = req.query.subjectId;
    }

    const questions = await Question.find(query);

    // Populate subject names and class names manually
    const populated = [];
    for (const q of questions) {
      const sub = await Subject.findById(q.subjectId);
      const cls = await Class.findById(q.classId);
      populated.push({
        id: q._id,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        subjectId: q.subjectId,
        subjectName: sub ? sub.name : 'Unknown Subject',
        classId: q.classId,
        className: cls ? cls.name : 'Unknown Class'
      });
    }

    return sendResponse(res, 200, true, 'Questions retrieved successfully.', populated);
  } catch (error) {
    next(error);
  }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const { questionText, options, correctAnswer, points } = req.body;
    const questionId = req.params.id;

    const question = await Question.findById(questionId);
    if (!question) {
      return sendResponse(res, 404, false, 'Question not found.');
    }

    if (String(question.teacherId) !== String(req.user.id)) {
      return sendResponse(res, 403, false, 'Unauthorized to edit this question.');
    }

    const updateData = {};
    if (questionText) updateData.questionText = questionText;
    if (options && Array.isArray(options)) updateData.options = options;
    if (correctAnswer !== undefined) updateData.correctAnswer = Number(correctAnswer);
    if (points !== undefined) updateData.points = Number(points);

    const updated = await Question.findByIdAndUpdate(questionId, updateData, { new: true });

    return sendResponse(res, 200, true, 'Question updated successfully.', updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const questionId = req.params.id;
    const question = await Question.findById(questionId);

    if (!question) {
      return sendResponse(res, 404, false, 'Question not found.');
    }

    if (String(question.teacherId) !== String(req.user.id)) {
      return sendResponse(res, 403, false, 'Unauthorized to delete this question.');
    }

    await Question.findByIdAndDelete(questionId);
    return sendResponse(res, 200, true, 'Question deleted successfully.');
  } catch (error) {
    next(error);
  }
};
