const Video = require('../models/Video');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const cloudinary = require('../config/cloudinary');
const mongoose = require('mongoose');

const uploadBuffer = (file, resourceType, folder) => new Promise((resolve, reject) => {
	const uploadOptions = {
		resource_type: resourceType,
		folder,
		chunk_size: 6 * 1024 * 1024,
	};
	const uploadMethod = resourceType === 'video'
		? cloudinary.uploader.upload_chunked_stream
		: cloudinary.uploader.upload_stream;
	const stream = uploadMethod.call(
		cloudinary.uploader,
		uploadOptions,
		(error, result) => {
			if (error) {
				const uploadError = new Error(error.message || 'Cloudinary upload failed');
				uploadError.statusCode = 502;
				return reject(uploadError);
			}

			return resolve(result);
		},
	);
	stream.end(file.buffer);
});

const uploadVideo = async ({ body, files, userId }) => {
	if (mongoose.connection.readyState !== 1) {
		const error = new Error('Database is unavailable');
		error.statusCode = 503;
		throw error;
	}

	const videoFile = files?.video?.[0];
	if (!videoFile) {
		const error = new Error('A video file is required');
		error.statusCode = 400;
		throw error;
	}

	if (!body.title?.trim()) {
		const error = new Error('Title is required');
		error.statusCode = 400;
		throw error;
	}
	if (!body.description?.trim()) {
		const error = new Error('Description is required');
		error.statusCode = 400;
		throw error;
	}
	const duration = body.duration === undefined || body.duration === '' ? 0 : Number(body.duration);
	if (!Number.isFinite(duration) || duration < 0) {
		const error = new Error('A valid non-negative duration is required');
		error.statusCode = 400;
		throw error;
	}
	if (!userId || !mongoose.isValidObjectId(userId)) {
		const error = new Error('Authenticated user is invalid');
		error.statusCode = 401;
		throw error;
	}

	const videoAsset = await uploadBuffer(videoFile, 'video', 'reelio/videos');
	let thumbnailAsset;

	try {
		if (files.thumbnail?.[0]) {
			thumbnailAsset = await uploadBuffer(files.thumbnail[0], 'image', 'reelio/thumbnails');
		}

		const video = await Video.create({
			title: body.title.trim(),
			description: body.description.trim(),
			videoUrl: videoAsset.secure_url,
			publicId: videoAsset.public_id,
			thumbnailUrl: thumbnailAsset?.secure_url || '',
			thumbnailPublicId: thumbnailAsset?.public_id || '',
			duration,
			...(body.category ? { category: body.category } : {}),
			uploadedBy: userId,
		});
		return video;
	} catch (error) {
		await cloudinary.uploader.destroy(videoAsset.public_id, { resource_type: 'video' }).catch(() => null);
		if (thumbnailAsset) {
			await cloudinary.uploader.destroy(thumbnailAsset.public_id, { resource_type: 'image' }).catch(() => null);
		}
		throw error;
	}
};

const getAllVideos = async () => Video.find()
	.populate('uploadedBy', 'name email role')
	.sort({ createdAt: -1 });

const browseVideos = async () => Video.find()
	.select('title description thumbnailUrl duration uploadedBy createdAt')
	.populate('uploadedBy', 'name')
	.sort({ createdAt: -1 });

const getVideoById = async (videoId) => {
	if (!mongoose.isValidObjectId(videoId)) {
		const error = new Error('Invalid video ID');
		error.statusCode = 400;
		throw error;
	}

	// $inc is atomic in the database, so two people opening the same video at the same
	// moment both count. Reading the number, adding one and saving it would lose one of them.
	const video = await Video.findByIdAndUpdate(
		videoId,
		{ $inc: { views: 1 } },
		{ new: true },
	).populate('uploadedBy', 'name email role');
	if (!video) {
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}

	return video;
};

const getMyVideos = async (userId) => {
	if (!userId || !mongoose.isValidObjectId(userId)) {
		const error = new Error('Authenticated user is invalid');
		error.statusCode = 401;
		throw error;
	}

	return Video.find({ uploadedBy: userId })
		.populate('uploadedBy', 'name email role')
		.sort({ createdAt: -1 });
};

const findManageableVideo = async (videoId, actor) => {
	if (!mongoose.isValidObjectId(videoId)) {
		const error = new Error('Invalid video ID');
		error.statusCode = 400;
		throw error;
	}

	const video = await Video.findById(videoId);
	if (!video) {
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}

	if (actor?.role !== 'admin' && String(video.uploadedBy) !== String(actor?.id)) {
		const error = new Error('You can only manage videos you uploaded');
		error.statusCode = 403;
		throw error;
	}

	return video;
};

const updateVideo = async (videoId, updates, actor) => {
	const video = await findManageableVideo(videoId, actor);
	updates = updates || {};
	let hasUpdates = false;

	if (Object.prototype.hasOwnProperty.call(updates, 'category')) {
		video.category = updates.category;
		hasUpdates = true;
	}

	for (const field of ['title', 'description']) {
		if (Object.prototype.hasOwnProperty.call(updates, field)) {
			if (typeof updates[field] !== 'string' || !updates[field].trim()) {
				const error = new Error(`${field} is required`);
				error.statusCode = 400;
				throw error;
			}
			video[field] = updates[field].trim();
			hasUpdates = true;
		}
	}

	if (Object.prototype.hasOwnProperty.call(updates, 'duration')) {
		const duration = Number(updates.duration);
		if (!Number.isFinite(duration) || duration < 0) {
			const error = new Error('A valid non-negative duration is required');
			error.statusCode = 400;
			throw error;
		}
		video.duration = duration;
		hasUpdates = true;
	}

	if (!hasUpdates) {
		const error = new Error('Provide a title, description, or duration to update');
		error.statusCode = 400;
		throw error;
	}

	return video.save();
};

const deleteVideo = async (videoId, actor) => {
	const video = await findManageableVideo(videoId, actor);
	await video.deleteOne();

	// Comments and likes point at a video that no longer exists. Left behind they are
	// invisible rows that still count: a deleted video's likes would keep inflating any
	// future total, and its comments would resurface if an id were ever reused.
	await Promise.all([
		Comment.deleteMany({ video: videoId }),
		Like.deleteMany({ video: videoId }),
	]).catch((error) => console.error('Failed to clean up comments/likes:', error.message));

	const cleanup = [
		cloudinary.uploader.destroy(video.publicId, { resource_type: 'video' }),
	];
	if (video.thumbnailPublicId) {
		cleanup.push(cloudinary.uploader.destroy(video.thumbnailPublicId, { resource_type: 'image' }));
	}

	const results = await Promise.allSettled(cleanup);
	for (const result of results) {
		if (result.status === 'rejected') {
			console.error('Cloudinary cleanup failed after deleting video:', result.reason.message);
		}
	}

	return video;
};

module.exports = { uploadVideo, getAllVideos, browseVideos, getVideoById, getMyVideos, updateVideo, deleteVideo };
