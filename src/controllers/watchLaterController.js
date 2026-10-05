const watchLaterService = require('../services/watchLaterService');

exports.saveVideo = async (req, res, next) => {
	try {
		const savedVideo = await watchLaterService.saveVideo(req.user.id, req.body.videoId);
		return res.status(200).json({
			success: true,
			message: 'Video saved to Watch Later',
			data: { savedVideo },
		});
	} catch (error) {
		return next(error);
	}
};

exports.getSavedVideos = async (req, res, next) => {
	try {
		const savedVideos = await watchLaterService.getSavedVideos(req.user.id);
		return res.status(200).json({
			success: true,
			data: { savedVideos },
		});
	} catch (error) {
		return next(error);
	}
};

exports.removeSavedVideo = async (req, res, next) => {
	try {
		await watchLaterService.removeSavedVideo(req.user.id, req.params.videoId);
		return res.status(200).json({
			success: true,
			message: 'Video removed from Watch Later',
		});
	} catch (error) {
		return next(error);
	}
};