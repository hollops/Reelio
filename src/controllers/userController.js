const userService = require('../services/userService');

// PUT /api/users/me — the signed-in person edits their own profile.
//
// multipart/form-data, not JSON, because JSON cannot carry a file. That means every text
// field arrives as a STRING: removeAvatar is the string 'true', never a boolean.
exports.updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateProfile({
      userId: req.user.id,
      // Absent means "leave it alone"; present but empty is a validation error.
      name: req.body.name,
      avatarFile: req.file,
      removeAvatar: req.body.removeAvatar === 'true',
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    return next(error);
  }
};
