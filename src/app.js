const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const videoRoutes = require('./routes/videoRoutes');
const adminRoutes = require('./routes/adminRoutes');
const historyRoutes = require('./routes/historyRoutes')
const watchLaterRoutes = require('./routes/watchLaterRoutes');
const { errorHandler } = require('./middleware/errorMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/watch-later', watchLaterRoutes);

app.use(errorHandler);

module.exports = app;
