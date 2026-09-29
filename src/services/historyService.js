const WatchHistory = require('../models/WatchHistory');
const Video = require('../models/Video');

const saveProgress = async (userId, videoId, progress, duration) => {
  // Check if the video exists
  const video = await Video.findById(videoId);

  if (!video) {
    throw new Error('Video not found');
  }

  // Check if this user already has history for this video
  let history = await WatchHistory.findOne({
    user: userId,
    video: videoId,
  });

  // Determine if the video is completed
  const completed = progress >= duration - 5;

  if (history) {
    // Update existing history
    history.progress = progress;
    history.duration = duration;
    history.completed = completed;
    history.lastWatchedAt = new Date();
  } else {
    // Create new history
    history = new WatchHistory({
      user: userId,
      video: videoId,
      progress,
      duration,
      completed,
      lastWatchedAt: new Date(),
    });
  }

  await history.save();

  return history;
};

const getUserHistory = async (userId) => {
  const history = await WatchHistory.find({ user: userId })
    .populate('video')
    .sort({ lastWatchedAt: -1 });

  return history;
};

const getVideoHistory = async (userId, videoId) => {
  const history = await WatchHistory.findOne({
    user: userId,
    video: videoId,
  }).populate('video');

  return history;
};

const deleteVideoHistory = async (userId, videoId) => {
  const history = await WatchHistory.findOneAndDelete({
    user: userId,
    video: videoId,
  });

  if (!history) {
    throw new Error('History not found');
  }

  return history;
};

module.exports = {
  saveProgress,
  getUserHistory,
  getVideoHistory,
  deleteVideoHistory,
};