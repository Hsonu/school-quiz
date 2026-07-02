const bcrypt = require('bcryptjs');
const Teacher = require('../models/Teacher');
const generateToken = require('../utils/jwtToken');
const { validateEmail, validatePassword } = require('../utils/validator');
const sendResponse = require('../utils/response');


exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendResponse(res, 400, false, 'Please provide email and password.');
    }

    const teacher = await Teacher.findOne({ email });
    if (!teacher) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    const isMatch = await bcrypt.compare(password, teacher.password);
    if (!isMatch) {
      return sendResponse(res, 401, false, 'Invalid credentials.');
    }

    if (teacher.isActive === false) {
      return sendResponse(res, 403, false, 'Your account has been deactivated. Please contact Nakul Sir.');
    }

    const token = generateToken(teacher._id, 'teacher');

    return sendResponse(res, 200, true, 'Logged in successfully.', {
      token,
      teacher: {
        id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        designation: teacher.designation,
        profilePic: teacher.profilePic
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const teacher = await Teacher.findById(req.user.id);
    if (!teacher) {
      return sendResponse(res, 404, false, 'Teacher not found.');
    }

    // Don't return password
    const profile = {
      id: teacher._id,
      name: teacher.name,
      email: teacher.email,
      designation: teacher.designation,
      profilePic: teacher.profilePic
    };

    return sendResponse(res, 200, true, 'Profile fetched successfully.', profile);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, designation, password } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (designation) updateData.designation = designation;

    if (password) {
      if (!validatePassword(password)) {
        return sendResponse(res, 400, false, 'Password must be at least 6 characters.');
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (req.file) {
      // Store filename relative to uploads directory
      updateData.profilePic = `/uploads/${req.file.filename}`;
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(req.user.id, updateData, { new: true });

    return sendResponse(res, 200, true, 'Profile updated successfully.', {
      id: updatedTeacher._id,
      name: updatedTeacher.name,
      email: updatedTeacher.email,
      designation: updatedTeacher.designation,
      profilePic: updatedTeacher.profilePic
    });
  } catch (error) {
    next(error);
  }
};
