require('dotenv').config({ quiet: true });
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const accessLogsRoutes = require('./routes/accessLogs');
const authRoutes = require('./routes/auth');
const devicesRoutes = require('./routes/devices');
const healthRoutes = require('./routes/health');
const lockRoutes = require('./routes/lock');
const recognitionEventsRoutes = require('./routes/recognitionEvents');
const smartHomeRoutes = require('./routes/smartHome');
const usersRoutes = require('./routes/users');
const apiKeyAuth = require('./middleware/apiKeyAuth');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const sessionAuth = require('./middleware/sessionAuth');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api', apiKeyAuth);
app.use('/api/recognition-events', recognitionEventsRoutes);
app.use('/api/smart-home', smartHomeRoutes);
app.use('/api', sessionAuth);
app.use('/api/users', usersRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/access-logs', accessLogsRoutes);
app.use('/api/lock', lockRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
