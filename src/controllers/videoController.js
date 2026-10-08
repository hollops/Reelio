const videoService = require('../services/videoService');
const commentService = require('../services/commentService');
const likeService = require('../services/likeService');

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

    // Fetched together, not one after the other: they do not depend on each other, so
    // waiting for the comments before asking about the like would just be slower.
    // req.user is undefined for a signed-out visitor, and hasLiked answers false.
    const [comments, likedByMe] = await Promise.all([
      commentService.getComments(req.params.id),
      likeService.hasLiked({ videoId: req.params.id, userId: req.user?.id }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Video retrieved successfully',
      data: { ...video.toObject(), comments, likedByMe },
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

exports.getComments = async (req, res, next) => {
  try {
    const comments = await commentService.getComments(req.params.id);
    return res.status(200).json({ success: true, message: 'Comments retrieved successfully', data: comments });
  } catch (error) {
    return next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const comment = await commentService.addComment({
      videoId: req.params.id,
      userId: req.user.id,
      text: req.body.text,
    });
    return res.status(201).json({ success: true, message: 'Comment added successfully', data: comment });
  } catch (error) {
    return next(error);
  }
};

exports.likeVideo = async (req, res, next) => {
  try {
    const result = await likeService.likeVideo({ videoId: req.params.id, userId: req.user.id });
    return res.status(200).json({ success: true, message: 'Video liked', data: result });
  } catch (error) {
    return next(error);
  }
};

exports.unlikeVideo = async (req, res, next) => {
  try {
    const result = await likeService.unlikeVideo({ videoId: req.params.id, userId: req.user.id });
    return res.status(200).json({ success: true, message: 'Like removed', data: result });
  } catch (error) {
    return next(error);
  }
};
