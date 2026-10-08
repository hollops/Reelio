const mongoose = require('mongoose');

// One row per (person, video). Modelled on WatchLater, which solves the same problem.
//
// Why a collection rather than an array of user ids on the Video: an array grows without
// limit inside one document, and a popular video would eventually outgrow Mongo's 16MB
// document cap. Rows also let us answer "did THIS person like it?" with an index instead
// of scanning an array.
//
// Video.likes holds the COUNT so cards and lists do not have to count rows every time.
const likeSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		video: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Video',
			required: true,
		},
	},
	{ timestamps: true },
);

// The database refuses a second like from the same person, whatever the application does.
// A check-then-insert in code can be raced by two taps; a unique index cannot.
likeSchema.index({ user: 1, video: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
