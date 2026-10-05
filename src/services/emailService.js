const nodemailer = require('nodemailer');

const sendPasswordResetEmail = async (email, resetUrl) => {
	const { GMAIL_USER, GMAIL_APP_PASSWORD } = process.env;
	if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
		throw new Error('Gmail SMTP is not configured');
	}

	const transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: GMAIL_USER,
			pass: GMAIL_APP_PASSWORD.replace(/\s/g, ''),
		},
	});

	await transporter.sendMail({
		from: GMAIL_USER,
		to: email,
		subject: 'Reset your Viora password',
		text: `Use this link to reset your Viora password within 15 minutes: ${resetUrl}`,
		html: `<p>A password reset was requested for your Reelio account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 15 minutes. If you did not request this, you can ignore this email.</p>`,
	});
};

module.exports = { sendPasswordResetEmail };