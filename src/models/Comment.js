const mongoose = require('mongoose');

// A comment belongs to one video and one author. The author's NAME is not stored here:
// it is read from the User at display time, so someone renaming themselves updates every
// comment they ever wrote, rather than leaving a trail of old names.
const commentSchema = new mongoose.Schema(
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
		text: {
			type: String,
			required: true,
			trim: true,
			// The client stops at 500 too; a server limit the client does not know about
			// shows up as a mysterious rejection after someone has finished typing.
			maxlength: 500,
		},
	},
	{ timestamps: true },
);

// Comments are always read as "this video's comments, newest first".
commentSchema.index({ video: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
