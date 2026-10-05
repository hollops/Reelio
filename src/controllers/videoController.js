const videoService = require('../services/videoService');

exports.uploadVideo = async (req, res, next) => {
  try {
    const video = await videoService.uploadVideo({
      body: req.body,
      files: req.files,
      userId: req.user._id || req.user.id,
    });

    return res.status(201).json({
		success: true,
      message: 'Video uploaded successfully',
		data: { video },
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAllVideos = async (req, res, next) => {
  try {
    const videos = await videoService.getAllVideos();
    return res.status(200).json({
      message: 'Videos retrieved successfully',
      videos,
    });
  } catch (error) {
    return next(error);
  }
};

exports.browseVideos = async (req, res, next) => {
  try {
    const videos = await videoService.browseVideos();
    return res.status(200).json({
      success: true,
      message: 'Videos retrieved successfully',
      videos,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getVideoById = async (req, res, next) => {
  try {
    const video = await videoService.getVideoById(req.params.id);
    return res.status(200).json({
      message: 'Video retrieved successfully',
      video,
    });
  } catch (error) {
    return next(error);
  }
};

exports.getMyVideos = async (req, res, next) => {
  try {
    const videos = await videoService.getMyVideos(req.user.id);
    return res.status(200).json({ success: true, data: { videos } });
  } catch (error) {
    return next(error);
  }
};

exports.updateVideo = async (req, res, next) => {
  try {
    const video = await videoService.updateVideo(req.params.id, req.body, req.user);
    return res.status(200).json({ success: true, message: 'Video updated successfully', data: { video } });
  } catch (error) {
    return next(error);
  }
};

exports.deleteVideo = async (req, res, next) => {
  try {
    await videoService.deleteVideo(req.params.id, req.user);
    return res.status(200).json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    return next(error);
  }
};
