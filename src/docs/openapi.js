const jsonRequest = (schema) => ({
	required: true,
	content: {
		'application/json': {
		schema: { $ref: `#/components/schemas/${schema}` },
		},
	},
});

const jsonResponse = (description) => ({
	description,
	content: {
		'application/json': {
		schema: { type: 'object', additionalProperties: true },
		},
	},
});

const videoIdParameter = {
	name: 'id',
	in: 'path',
	required: true,
	schema: { type: 'string', example: '507f1f77bcf86cd799439011' },
};

const historyVideoIdParameter = {
	...videoIdParameter,
	name: 'videoId',
};

const responses = (successDescription, successCode = '200') => ({
	[successCode]: jsonResponse(successDescription),
	'400': jsonResponse('Invalid request data.'),
	'401': jsonResponse('Authentication is required or the token is invalid.'),
	'500': jsonResponse('Unexpected server error.'),
});

const openApi = {
	openapi: '3.0.3',
	info: {
		title: 'Reelio API',
		version: '1.0.0',
		description: 'API for user accounts, video browsing and uploads, watch history, and Watch Later.',
	},
	servers: [
		{ url: '/api', description: 'This Reelio backend (current host)' },
		{ url: 'https://viora-94kb.onrender.com/api', description: 'Reelio on Render' },
	],
	tags: [
		{ name: 'Auth' },
		{ name: 'Videos' },
		{ name: 'History' },
		{ name: 'Watch Later' },
		{ name: 'Admin' },
	],
	paths: {
		'/auth/createuser': {
			post: {
				tags: ['Auth'],
				summary: 'Register a user',
				requestBody: jsonRequest('CreateUserRequest'),
				responses: { ...responses('User created.', '201'), '400': jsonResponse('Required fields are missing, password is weak, or email is already registered.') },
			},
		},
		'/auth/loginuser': {
			post: {
				tags: ['Auth'],
				summary: 'Log in and receive a JWT',
				requestBody: jsonRequest('LoginRequest'),
				responses: { ...responses('Login successful.'), '401': jsonResponse('Email or password is invalid.') },
			},
		},
		'/auth/forgot-password': {
			post: {
				tags: ['Auth'],
				summary: 'Request a password reset email',
				description: 'Returns the same response whether or not the email belongs to an account.',
				requestBody: jsonRequest('ForgotPasswordRequest'),
				responses: responses('If the account exists, a reset link was sent.'),
			},
		},
		'/auth/reset-password': {
			post: {
				tags: ['Auth'],
				summary: 'Set a new password with a reset token',
				requestBody: jsonRequest('ResetPasswordRequest'),
				responses: responses('Password reset successfully.'),
			},
		},
		'/videos': {
			get: {
				tags: ['Videos'],
				summary: 'Browse the public video catalog',
				description: 'Returns catalog metadata and thumbnails. Playback URLs are not included.',
				responses: responses('Videos retrieved successfully.'),
			},
			post: {
				tags: ['Videos'],
				summary: 'Upload a video',
				security: [{ BearerAuth: [] }],
				requestBody: {
					required: true,
					content: {
						'multipart/form-data': {
							schema: { $ref: '#/components/schemas/UploadVideoRequest' },
						},
					},
				},
				responses: { ...responses('Video uploaded successfully.', '201'), '400': jsonResponse('Video, title, description, or duration is invalid.') },
			},
		},
		'/videos/mine': {
			get: {
				tags: ['Videos'],
				summary: 'List videos uploaded by the signed-in user',
				security: [{ BearerAuth: [] }],
				responses: responses('User videos retrieved successfully.'),
			},
		},
		'/videos/{id}': {
			parameters: [videoIdParameter],
			get: {
				tags: ['Videos'],
				summary: 'Get video details for playback',
				description: 'Requires authentication and returns the video playback URL.',
				security: [{ BearerAuth: [] }],
				responses: { ...responses('Video details retrieved.'), '404': jsonResponse('Video not found.') },
			},
			patch: {
				tags: ['Videos'],
				summary: 'Update an uploaded video',
				description: 'The uploader or an admin can update the video.',
				security: [{ BearerAuth: [] }],
				requestBody: jsonRequest('UpdateVideoRequest'),
				responses: { ...responses('Video updated successfully.'), '403': jsonResponse('You do not have permission to update this video.'), '404': jsonResponse('Video not found.') },
			},
			delete: {
				tags: ['Videos'],
				summary: 'Delete an uploaded video',
				description: 'The uploader or an admin can delete the video.',
				security: [{ BearerAuth: [] }],
				responses: { ...responses('Video deleted successfully.'), '403': jsonResponse('You do not have permission to delete this video.'), '404': jsonResponse('Video not found.') },
			},
		},
		'/history': {
			get: {
				tags: ['History'],
				summary: 'List the signed-in user’s watch history',
				security: [{ BearerAuth: [] }],
				responses: responses('Watch history retrieved successfully.'),
			},
			post: {
				tags: ['History'],
				summary: 'Save or update playback progress',
				security: [{ BearerAuth: [] }],
				requestBody: jsonRequest('SaveProgressRequest'),
				responses: responses('Watch progress saved successfully.'),
			},
		},
		'/history/{videoId}': {
			parameters: [historyVideoIdParameter],
			get: {
				tags: ['History'],
				summary: 'Get this user’s history for one video',
				security: [{ BearerAuth: [] }],
				responses: responses('Video history retrieved successfully.'),
			},
			delete: {
				tags: ['History'],
				summary: 'Delete this user’s history for one video',
				security: [{ BearerAuth: [] }],
				responses: { ...responses('Watch history deleted successfully.'), '404': jsonResponse('History not found.') },
			},
		},
		'/watch-later': {
			get: {
				tags: ['Watch Later'],
				summary: 'List saved videos',
				security: [{ BearerAuth: [] }],
				responses: responses('Saved videos retrieved successfully.'),
			},
			post: {
				tags: ['Watch Later'],
				summary: 'Save a video to Watch Later',
				security: [{ BearerAuth: [] }],
				requestBody: jsonRequest('WatchLaterRequest'),
				responses: { ...responses('Video saved to Watch Later.'), '404': jsonResponse('Video not found.') },
			},
		},
		'/watch-later/{videoId}': {
			parameters: [historyVideoIdParameter],
			delete: {
				tags: ['Watch Later'],
				summary: 'Remove a video from Watch Later',
				security: [{ BearerAuth: [] }],
				responses: { ...responses('Video removed from Watch Later.'), '404': jsonResponse('Video is not saved in Watch Later.') },
			},
		},
		'/admin/users': {
			get: {
				tags: ['Admin'],
				summary: 'List all users',
				security: [{ BearerAuth: [] }],
				description: 'Requires an authenticated admin account.',
				responses: responses('Users retrieved successfully.'),
			},
		},
		'/admin/videos': {
			get: {
				tags: ['Admin'],
				summary: 'List all videos with management details',
				security: [{ BearerAuth: [] }],
				description: 'Requires an authenticated admin account.',
				responses: responses('Videos retrieved successfully.'),
			},
		},
		'/admin/videos/{id}': {
			parameters: [videoIdParameter],
			patch: {
				tags: ['Admin'],
				summary: 'Update any video as an admin',
				security: [{ BearerAuth: [] }],
				requestBody: jsonRequest('UpdateVideoRequest'),
				responses: { ...responses('Video updated successfully.'), '403': jsonResponse('Admin role required.'), '404': jsonResponse('Video not found.') },
			},
			delete: {
				tags: ['Admin'],
				summary: 'Delete any video as an admin',
				security: [{ BearerAuth: [] }],
				responses: { ...responses('Video deleted successfully.'), '403': jsonResponse('Admin role required.'), '404': jsonResponse('Video not found.') },
			},
		},
	},
	components: {
		securitySchemes: {
			BearerAuth: {
				type: 'http',
				scheme: 'bearer',
				bearerFormat: 'JWT',
			},
		},
		schemas: {
			CreateUserRequest: {
				type: 'object',
				required: ['name', 'email', 'password'],
				properties: {
					name: { type: 'string', example: 'Alex Morgan' },
					email: { type: 'string', format: 'email', example: 'alex@example.com' },
					password: { type: 'string', minLength: 8, description: 'Must contain an uppercase letter, number, and special character.', example: 'ReelioPass1!' },
				},
			},
			LoginRequest: {
				type: 'object',
				required: ['email', 'password'],
				properties: {
					email: { type: 'string', format: 'email' },
					password: { type: 'string', example: 'ReelioPass1!' },
				},
			},
			ForgotPasswordRequest: {
				type: 'object',
				required: ['email'],
				properties: { email: { type: 'string', format: 'email' } },
			},
			ResetPasswordRequest: {
				type: 'object',
				required: ['token', 'password'],
				properties: {
					token: { type: 'string' },
					password: { type: 'string', minLength: 8, description: 'Must contain an uppercase letter, number, and special character.', example: 'NewReelioPass1!' },
				},
			},
			UploadVideoRequest: {
				type: 'object',
				required: ['title', 'description', 'video'],
				properties: {
					title: { type: 'string' },
					description: { type: 'string' },
					duration: { type: 'number', minimum: 0 },
					video: { type: 'string', format: 'binary', description: 'Video file, maximum 500 MB.' },
					thumbnail: { type: 'string', format: 'binary', description: 'Optional image thumbnail.' },
				},
			},
			UpdateVideoRequest: {
				type: 'object',
				minProperties: 1,
				properties: {
					title: { type: 'string' },
					description: { type: 'string' },
					duration: { type: 'number', minimum: 0 },
				},
			},
			SaveProgressRequest: {
				type: 'object',
				required: ['videoId', 'progress', 'duration'],
				properties: {
					videoId: { type: 'string', example: '507f1f77bcf86cd799439011' },
					progress: { type: 'number', minimum: 0, example: 42 },
					duration: { type: 'number', minimum: 0, example: 120 },
				},
			},
			WatchLaterRequest: {
				type: 'object',
				required: ['videoId'],
				properties: { videoId: { type: 'string', example: '507f1f77bcf86cd799439011' } },
			},
		},
	},
};

module.exports = openApi;