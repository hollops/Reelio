const mongoose = require('mongoose');
const Video = require('../models/Video');
const WatchLater = require('../models/WatchLater');

const validateIds = (userId, videoId, requireVideoId = false) => {
	if (!mongoose.isValidObjectId(userId)) {
		const error = new Error('Authenticated user is invalid');
		error.statusCode = 401;
		throw error;
	}

	if (requireVideoId && !videoId) {
		const error = new Error('Video ID is required');
		error.statusCode = 400;
		throw error;
	}

	if (videoId && !mongoose.isValidObjectId(videoId)) {
		const error = new Error('Invalid video ID');
		error.statusCode = 400;
		throw error;
	}
};

const saveVideo = async (userId, videoId) => {
	validateIds(userId, videoId, true);

	const video = await Video.findById(videoId);
	if (!video) {
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}

	try {
		return await WatchLater.findOneAndUpdate(
			{ user: userId, video: videoId },
			{ $setOnInsert: { user: userId, video: videoId } },
			{ new: true, upsert: true },
		);
	} catch (error) {
		if (error.code !== 11000) throw error;
		return WatchLater.findOne({ user: userId, video: videoId });
	}
};

const getSavedVideos = async (userId) => {
	validateIds(userId);

	const saved = await WatchLater.find({ user: userId })
		.populate({ path: 'video', populate: { path: 'uploadedBy', select: 'name' } })
		.sort({ createdAt: -1 });

	// Return the VIDEOS, not the join rows that point at them.
	//
	// This previously returned the WatchLater documents themselves, so each item arrived
	// as { _id, user, video: {...}, createdAt } — a wrapper whose own _id is the join row's,
	// not the video's. A client reading .title found nothing and the page looked empty even
	// though saving had worked.
	//
	// The row is how we store the relationship; it is not what anyone asked for. "Give me
	// my saved videos" should answer with videos.
	//
	// filter() first: a video deleted after being saved leaves a row pointing at nothing,
	// and populate fills that with null.
	return saved.filter((row) => row.video).map((row) => row.video);
};

const removeSavedVideo = async (userId, videoId) => {
	validateIds(userId, videoId, true);

	const savedVideo = await WatchLater.findOneAndDelete({ user: userId, video: videoId });
	if (!savedVideo) {
		const error = new Error('Video is not in your Watch Later list');
		error.statusCode = 404;
		throw error;
	}

	return savedVideo;
};

module.exports = { saveVideo, getSavedVideos, removeSavedVideo };