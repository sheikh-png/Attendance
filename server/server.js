const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const requestIp = require('request-ip');

dotenv.config();

require('./config/db');

const app = express();

// When deployed behind a proxy (Render, Heroku, etc.) this helps express trust
app.set('trust proxy', true);

// Quick probe endpoint (placed before other requires) to validate request handling
app.get('/probe', (req, res) => res.json({ probe: true, pid: process.pid }));

app.use(express.json());
app.use(cors());
app.use(requestIp.mw());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Basic root + health endpoints useful for uptime checks and Render health checks
app.get('/', (req, res) => {
    res.json({ status: 'ok', environment: process.env.NODE_ENV || 'development' });
});

app.get('/healthz', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
