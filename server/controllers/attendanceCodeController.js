const AttendanceCode = require('../models/AttendanceCode');
const { format, addMinutes } = require('date-fns');

exports.generateCode = async (req, res) => {
    const { slot } = req.body;
    if (!['morning', 'afternoon', 'evening'].includes(slot)) {
        return res.status(400).json({ message: 'Invalid slot' });
    }

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const now = new Date();
        const expiresAt = addMinutes(now, 20);
        const today = format(now, 'yyyy-MM-dd');

        // Delete existing code for the same slot and date
        await AttendanceCode.deleteMany({ slot, date: today });

        const attendanceCode = new AttendanceCode({
            slot,
            code,
            date: today,
            expiresAt
        });

        await attendanceCode.save();

        res.json({
            message: `Code generated for ${slot}`,
            code,
            expiresAt: format(expiresAt, 'HH:mm:ss'),
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.getActiveCodes = async (req, res) => {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const codes = await AttendanceCode.find({ date: today });
        const now = new Date();
        const response = {};

        codes.forEach(data => {
            if (now < data.expiresAt) {
                response[data.slot] = {
                    code: data.code,
                    expiresAt: format(data.expiresAt, 'HH:mm:ss'),
                    timeLeft: Math.round((data.expiresAt - now) / 1000 / 60),
                };
            }
        });

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
