const videoService = require('../services/videoService');

exports.uploadVideo = async (req, res, next) => {
  try {
    const video = await videoService.uploadVideo({
      body: req.body,
      files: req.files,
      userId: req.user.id,
    });

    return res.status(201).json({
      message: 'Video uploaded successfully',
      video,
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
