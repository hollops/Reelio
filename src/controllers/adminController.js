const adminService = require('../services/adminService');

exports.getAllUsers = async (req, res, next) => {
	try {
		const users = await adminService.getAllUsers();
		return res.status(200).json({ success: true, data: { users } });
	} catch (error) {
		return next(error);
	}
};
