const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail } = require('./emailService');

const validatePassword = (password) => {
	if (
		typeof password !== 'string' ||
		password.length < 8 ||
		!/[A-Z]/.test(password) ||
		!/[0-9]/.test(password) ||
		!/[^A-Za-z0-9\s]/.test(password)
	) {
		const error = new Error(
			'Password must be at least 8 characters and include an uppercase letter, a number, and a special character',
		);
		error.statusCode = 400;
		throw error;
	}
};

const createUser = async ({ name, email, password }) => {
	if (!name || !email || !password) {
		const error = new Error('Please provide all required fields');
		error.statusCode = 400;
		throw error;
	}

	validatePassword(password);

	const existingUser = await User.findOne({ email });
	if (existingUser) {
		const error = new Error('Email already exists');
		error.statusCode = 400;
		throw error;
	}

	const salt = await bcrypt.genSalt(10);
	const hashedPassword = await bcrypt.hash(password, salt);
	const user = new User({ name, email, password: hashedPassword });

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

const requestPasswordReset = async (email) => {
	if (!email) {
		const error = new Error('Email is required');
		error.statusCode = 400;
		throw error;
	}

	const resetPageUrl = process.env.RESET_PASSWORD_URL;
	if (!resetPageUrl) {
		throw new Error('Password reset email is not configured');
	}

	const resetUrl = new URL(resetPageUrl);
	const user = await User.findOne({ email });
	if (!user) return;

	const resetToken = crypto.randomBytes(32).toString('hex');
	user.passwordResetToken = crypto
		.createHash('sha256')
		.update(resetToken)
		.digest('hex');
	user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
	await user.save();

	resetUrl.searchParams.set('token', resetToken);
	try {
		await sendPasswordResetEmail(user.email, resetUrl.toString());
	} catch (error) {
		user.passwordResetToken = undefined;
		user.passwordResetExpires = undefined;
		await user.save();
		throw error;
	}
};

const resetPassword = async ({ token, password }) => {
	if (!token) {
		const error = new Error('Password reset token is required');
		error.statusCode = 400;
		throw error;
	}

	validatePassword(password);

	const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
	const hashedPassword = await bcrypt.hash(password, 10);
	const user = await User.findOneAndUpdate(
		{
			passwordResetToken: tokenHash,
			passwordResetExpires: { $gt: new Date() },
		},
		{
			$set: { password: hashedPassword },
			$unset: {
				passwordResetToken: 1,
				passwordResetExpires: 1,
			},
		},
		{ new: true, runValidators: true },
	);

	if (!user) {
		const error = new Error('Password reset link is invalid or expired');
		error.statusCode = 400;
		throw error;
	}
};

module.exports = { createUser, loginUser, requestPasswordReset, resetPassword };
