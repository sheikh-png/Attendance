const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const requestIp = require('request-ip');

dotenv.config();

require('./config/db');

const app = express();

app.use(express.json());
app.use(cors());
app.use(requestIp.mw());

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
