const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const createUser = async ({ name, email, password, role }) => {
	if (!name || !email || !password) {
		const error = new Error('Please provide all required fields');
		error.statusCode = 400;
		throw error;
	}

	const existingUser = await User.findOne({ email });
	if (existingUser) {
		const error = new Error('Email already exists');
		error.statusCode = 400;
		throw error;
	}

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);
	const user = new User({ name, email, password: hashedPassword, role });

	await user.save();

	const safeUser = user.toObject();
	delete safeUser.password;
	return safeUser;
};

const loginUser = async ({ email, password }) => {
	if (!email || !password) {
		const error = new Error('Please provide all required fields');
		error.statusCode = 400;
		throw error;
	}

	const user = await User.findOne({ email });
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	const isPasswordValid = await bcrypt.compare(password, user.password);
	if (!isPasswordValid) {
		const error = new Error('Invalid password');
		error.statusCode = 401;
		throw error;
	}

	const token = jwt.sign(
		{ id: user._id, email: user.email, name: user.name, role: user.role },
		process.env.JWT_SECRET,
		{ expiresIn: '1h' },
	);

	return { token };
};

module.exports = { createUser, loginUser };
