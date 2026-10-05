const authService = require('../services/authService');


//create a user
exports.createUser = async (req, res) => {
  try {
    const user = await authService.createUser(req.body);
    res.status(201).json({ message: 'User created successfully', user });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error creating user' });
  }       

};


//login user
exports.loginUser = async (req, res) => {
  try {
    const { token } = await authService.loginUser(req.body);

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error logging in' });
  }
};

exports.requestPasswordReset = async (req, res) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Unable to send password reset email',
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body);
    res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.statusCode ? error.message : 'Unable to reset password',
    });
  }
};
