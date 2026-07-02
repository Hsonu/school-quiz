const studentAuth = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Student privileges required.'
    });
  }
};

module.exports = studentAuth;
