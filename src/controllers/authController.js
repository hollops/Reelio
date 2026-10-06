const authService = require('../services/authService');


//create a user
exports.createUser = async (req, res) => {
  try {
    const { token, user } = await authService.createUser(req.body);
    res.status(201).json({ success: true, message: 'User created successfully', data: { token, user } });

  } catch (error) {
    console.error('Error creating user:', error);
    res.status(error.statusCode || 500).json({ message: error.message || 'Error creating user' });
  }       

};


//login user
exports.loginUser = async (req, res) => {
  try {
    const { token, user } = await authService.loginUser(req.body);

    res.status(200).json({ success: true, message: 'Login successful', data: { token, user } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message || 'Error logging in' });
  }
};

// Who am I? The client sends the token it saved; this says who it belongs to.
// Without this a page refresh cannot restore a session: the token alone is opaque.
exports.getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.status(200).json({ success: true, message: 'User retrieved successfully', data: user });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message || 'Error fetching user' });
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
