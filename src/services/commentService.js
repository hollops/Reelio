const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Video = require('../models/Video');

const assertVideoExists = async (videoId) => {
	if (!mongoose.isValidObjectId(videoId)) {
		const error = new Error('Invalid video ID');
		error.statusCode = 400;
		throw error;
	}
	const exists = await Video.exists({ _id: videoId });
	if (!exists) {
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}
};

/**
 * Shape a stored comment into what the client expects.
 *
 * Done here, once, rather than in each controller: the client agreed on
 * { id, videoId, userId, authorName, text, createdAt } and should not have to know that
 * we store a `user` reference and populate it.
 */
const toClientComment = (comment) => ({
	_id: comment._id,
	videoId: comment.video,
	userId: comment.user?._id ?? comment.user,
	authorName: comment.user?.name ?? 'Unknown',
	text: comment.text,
	createdAt: comment.createdAt,
});

const addComment = async ({ videoId, userId, text }) => {
	await assertVideoExists(videoId);

	if (typeof text !== 'string' || !text.trim()) {
		const error = new Error('Comment text is required');
		error.statusCode = 400;
		throw error;
	}

	const comment = await Comment.create({ video: videoId, user: userId, text: text.trim() });
	// Read the author's name back so the client can show the comment immediately.
	await comment.populate('user', 'name');
	return toClientComment(comment);
};

const getComments = async (videoId) => {
	await assertVideoExists(videoId);

	const comments = await Comment.find({ video: videoId })
		.sort({ createdAt: -1 })
		.populate('user', 'name');

	return comments.map(toClientComment);
};

module.exports = { addComment, getComments, toClientComment };
