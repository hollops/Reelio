const mongoose = require('mongoose');
const Like = require('../models/Like');
const Video = require('../models/Video');

const assertValidVideoId = (videoId) => {
	if (!mongoose.isValidObjectId(videoId)) {
		const error = new Error('Invalid video ID');
		error.statusCode = 400;
		throw error;
	}
};

/**
 * Like a video. Pressing like twice leaves it liked once — it is not a toggle.
 *
 * The upsert decides atomically whether this was a NEW like: findOneAndUpdate with
 * `new: false` returns the document as it was BEFORE, so null means "there was none,
 * we just created it". Only then do we move the counter. Checking first and inserting
 * second could be raced by two taps and count the same person twice.
 */
const likeVideo = async ({ videoId, userId }) => {
	assertValidVideoId(videoId);

	const previous = await Like.findOneAndUpdate(
		{ user: userId, video: videoId },
		{ $setOnInsert: { user: userId, video: videoId } },
		{ upsert: true, new: false },
	);

	const video = previous
		? await Video.findById(videoId)
		: await Video.findByIdAndUpdate(videoId, { $inc: { likes: 1 } }, { new: true });

	if (!video) {
		// The video vanished between the like and the counter update; undo the orphan row.
		await Like.deleteOne({ user: userId, video: videoId });
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}

	return { likes: video.likes, likedByMe: true };
};

/** Remove a like. Removing one that was never there is not an error, just a no-op. */
const unlikeVideo = async ({ videoId, userId }) => {
	assertValidVideoId(videoId);

	// The delete itself tells us whether there was anything to delete.
	const removed = await Like.findOneAndDelete({ user: userId, video: videoId });

	const video = removed
		? await Video.findByIdAndUpdate(videoId, { $inc: { likes: -1 } }, { new: true })
		: await Video.findById(videoId);

	if (!video) {
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}

	return { likes: video.likes, likedByMe: false };
};

/** Has this person liked this video? False for signed-out visitors. */
const hasLiked = async ({ videoId, userId }) => {
	if (!userId || !mongoose.isValidObjectId(videoId)) return false;
	return Boolean(await Like.exists({ user: userId, video: videoId }));
};

module.exports = { likeVideo, unlikeVideo, hasLiked };
