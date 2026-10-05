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

	const savedVideos = await WatchLater.find({ user: userId })
		.populate({ path: 'video', populate: { path: 'uploadedBy', select: 'name' } })
		.sort({ createdAt: -1 });

	return savedVideos.filter((savedVideo) => savedVideo.video);
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