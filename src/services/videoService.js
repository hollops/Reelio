const Video = require('../models/Video');
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

	const videoAsset = await uploadBuffer(videoFile, 'video', 'reelio/videos');
	let thumbnailAsset;

	try {
		if (files.thumbnail?.[0]) {
			thumbnailAsset = await uploadBuffer(files.thumbnail[0], 'image', 'reelio/thumbnails');
		}

		return Video.create({
			title: body.title.trim(),
			description: body.description?.trim() || '',
			videoUrl: videoAsset.secure_url,
			publicId: videoAsset.public_id,
			thumbnailUrl: thumbnailAsset?.secure_url || '',
			duration: Number(body.duration) || 0,
			uploadedBy: userId,
		});
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

const getVideoById = async (videoId) => {
	if (!mongoose.isValidObjectId(videoId)) {
		const error = new Error('Invalid video ID');
		error.statusCode = 400;
		throw error;
	}

	const video = await Video.findById(videoId)
		.populate('uploadedBy', 'name email role');
	if (!video) {
		const error = new Error('Video not found');
		error.statusCode = 404;
		throw error;
	}

	return video;
};

module.exports = { uploadVideo, getAllVideos, getVideoById };
