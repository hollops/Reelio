const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const swaggerUi = require('swagger-ui-express');
const openApi = require('./docs/openapi');

const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const historyRoutes = require('./routes/historyRoutes')
const watchLaterRoutes = require('./routes/watchLaterRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
	const databaseConnected = mongoose.connection.readyState === 1;
	return res.status(databaseConnected ? 200 : 503).json({
		status: databaseConnected ? 'ok' : 'unavailable',
		database: databaseConnected ? 'connected' : 'disconnected',
	});
});

app.get('/api-docs.json', (req, res) => res.json(openApi));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApi, {
	customSiteTitle: 'Reelio API Documentation',
	persistAuthorization: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/watch-later', watchLaterRoutes);

app.use(errorHandler);

module.exports = app;
