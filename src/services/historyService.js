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

  // filter() before returning: a video deleted after it was watched leaves a row pointing at
  // nothing, and populate() fills that with null. Sent on, a null video reaches the History
  // page and the Home page's "Continue watching" row as a card with no title and no link,
  // which reads to the viewer as a broken video. A watched-then-deleted video simply drops
  // out of history, which is what someone would expect of it.
  return history.filter((row) => row.video);
};

const getVideoHistory = async (userId, videoId) => {
  const history = await WatchHistory.findOne({
    user: userId,
    video: videoId,
  }).populate('video');

  // Same guard as getUserHistory: a row whose video is gone is no history at all. Returning
  // it would hand the player a resume position for a video it cannot load.
  return history && history.video ? history : null;
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