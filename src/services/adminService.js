const User = require('../models/User');

const getAllUsers = () => User.find()
	.select('-password')
	.sort({ createdAt: -1 });

module.exports = { getAllUsers };
