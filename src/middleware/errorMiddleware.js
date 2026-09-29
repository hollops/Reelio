const errorHandler = (error, req, res, next) => {
	if (res.headersSent) return next(error);

	const statusCode = error.statusCode || 500;
	const message = statusCode >= 500 ? 'Something went wrong' : error.message;

	return res.status(statusCode).json({
		success: false,
		message,
	});
};

module.exports = { errorHandler };
