const historyService = require('../services/historyService');

const saveProgress = async (req, res, next) => {
  try {
    const { videoId, progress, duration } = req.body;
    const userId = req.user._id;

    const history = await historyService.saveProgress(
      userId,
      videoId,
      progress,
      duration
    );

    res.status(200).json({
      success: true,
      message: 'Watch progress saved successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

const getUserHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const history = await historyService.getUserHistory(userId);

    res.status(200).json({
      success: true,
      message: 'Watch history retrieved successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

const getVideoHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { videoId } = req.params;

    const history = await historyService.getVideoHistory(
      userId,
      videoId
    );

    res.status(200).json({
      success: true,
      message: 'Video history retrieved successfully',
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

const deleteVideoHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { videoId } = req.params;

    await historyService.deleteVideoHistory(userId, videoId);

    res.status(200).json({
      success: true,
      message: 'Watch history deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveProgress,
  getUserHistory,
  getVideoHistory,
  deleteVideoHistory,
};