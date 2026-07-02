module.exports = {
  secret: process.env.JWT_SECRET || 'super_secret_key_for_school_quiz_system',
  expiresIn: '7d'
};
