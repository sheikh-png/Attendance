const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const requestIp = require('request-ip');

// Load env vars
dotenv.config();

require('./config/db'); // This initializes Firebase Admin

const app = express();

// Body parser
app.use(express.json());

// Enable CORS
app.use(cors());

// Request IP middleware
app.use(requestIp.mw());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
