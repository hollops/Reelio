const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

const NAME_MAX_LENGTH = 50;

/**
 * Send one image buffer to Cloudinary.
 *
 * A smaller cousin of videoService's uploadBuffer: avatars are images, so there is no
 * chunking and no resource_type juggling. Worth extracting into a shared util if a third
 * caller ever appears; duplicating twelve lines is cheaper than a refactor nobody needs.
 */
const uploadAvatarBuffer = (file) =>
	new Promise((resolve, reject) => {
		const stream = cloudinary.uploader.upload_stream(
			{
				resource_type: 'image',
				folder: 'reelio/avatars',
				// Cloudinary does the resizing, so we never store a 2MB photo to show at 40px.
				transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
			},
			(error, result) => {
				if (error) {
					const uploadError = new Error(error.message || 'Avatar upload failed');
					uploadError.statusCode = 502;
					return reject(uploadError);
				}
				return resolve(result);
			},
		);
		stream.end(file.buffer);
	});

const toSafeUser = (user) => {
	const safe = user.toObject();
	delete safe.password;
	delete safe.passwordResetToken;
	delete safe.passwordResetExpires;
	return safe;
};

/**
 * Update the signed-in person's own profile. Every field is optional: the client sends
 * only what changed, so an absent `name` means "leave it alone", not "clear it".
 */
const updateProfile = async ({ userId, name, avatarFile, removeAvatar }) => {
	const user = await User.findById(userId);
	if (!user) {
		const error = new Error('User not found');
		error.statusCode = 404;
		throw error;
	}

	if (name !== undefined) {
		const trimmed = String(name).trim();
		if (!trimmed) {
			const error = new Error('Name is required');
			error.statusCode = 400;
			throw error;
		}
		if (trimmed.length > NAME_MAX_LENGTH) {
			const error = new Error(`Name must be ${NAME_MAX_LENGTH} characters or fewer`);
			error.statusCode = 400;
			throw error;
		}
		user.name = trimmed;
	}

	// Upload BEFORE changing anything on the user. If Cloudinary refuses, the profile is
	// untouched rather than half-saved with a new name and the old photo.
	let uploaded = null;
	if (avatarFile) {
		uploaded = await uploadAvatarBuffer(avatarFile);
	}

	const previousPublicId = user.avatarPublicId;

	if (uploaded) {
		user.avatarUrl = uploaded.secure_url;
		user.avatarPublicId = uploaded.public_id;
	} else if (removeAvatar) {
		user.avatarUrl = '';
		user.avatarPublicId = '';
	}

	await user.save();

	// Only once the save succeeded is the old image genuinely unreferenced. Deleting it
	// earlier would lose the photo if the save then failed. A failure here costs storage,
	// never data, so it is logged rather than thrown.
	if (previousPublicId && (uploaded || removeAvatar)) {
		cloudinary.uploader
			.destroy(previousPublicId, { resource_type: 'image' })
			.catch((error) => console.error('Failed to delete old avatar:', error.message));
	}

	return toSafeUser(user);
};

module.exports = { updateProfile, NAME_MAX_LENGTH };
