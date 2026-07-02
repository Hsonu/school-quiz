const principalAuth = (req, res, next) => {
  if (req.user && (req.user.role === 'principal' || req.user.role === 'owner')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Principal or Owner privileges required.'
    });
  }
};

module.exports = principalAuth;
