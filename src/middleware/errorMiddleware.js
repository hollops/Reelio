const multer = require('multer');

/**
 * Turn an upload failure into an answer the caller can act on.
 *
 * Without this, an oversized avatar came back as `500 Something went wrong`, because multer
 * throws a plain Error with no statusCode and anything 500 or above has its message hidden.
 * A client cannot tell "your file is too big" from "the database is down" — and nor can
 * whoever is debugging it. That is exactly what happened here: a perfectly working upload
 * path looked broken because its one real cause was behind a generic 500.
 */
const describeUploadError = (error) => {
	if (error instanceof multer.MulterError) {
		switch (error.code) {
			case 'LIMIT_FILE_SIZE':
				// 413 is the status for a body the server refuses on size.
				return { statusCode: 413, message: 'That file is too large.' };
			case 'LIMIT_UNEXPECTED_FILE':
				return { statusCode: 400, message: `Unexpected file field "${error.field}".` };
			default:
				return { statusCode: 400, message: error.message };
		}
	}

	// fileFilter rejections are plain Errors thrown by our own filters, and their messages
	// are already written for the person who has to read them.
	if (/^(Only video files|Avatar must be)/.test(error.message || '')) {
		return { statusCode: 400, message: error.message };
	}

	return null;
};

const errorHandler = (error, req, res, next) => {
	if (res.headersSent) return next(error);

	const upload = describeUploadError(error);
	if (upload) {
		return res.status(upload.statusCode).json({ success: false, message: upload.message });
	}

	const statusCode = error.statusCode || 500;
	// A 5xx message stays hidden on purpose: it may carry a stack, a query or a connection
	// string, and none of that belongs in a response.
	const message = statusCode >= 500 ? 'Something went wrong' : error.message;

	return res.status(statusCode).json({
		success: false,
		message,
	});
};

module.exports = { errorHandler };
