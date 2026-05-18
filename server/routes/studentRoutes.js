const express = require('express');
const router = express.Router();
const { format } = require('date-fns');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Config = require('../models/Config');
const Student = require('../models/Student');
const { protect } = require('../middleware/authMiddleware');
const { applyDynamicExpiry } = require('../utils/attendanceUtils');

router.use(protect);

router.get('/dashboard', async (req, res) => {
    try {
        const studentId = req.user.id;
        const student = await Student.findById(studentId).select('-password');
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const joinDateStr = student.joinDate ? format(student.joinDate, 'yyyy-MM-dd') : null;
        const attendanceQuery = { student: studentId };
        if (joinDateStr) {
            attendanceQuery.date = { $gte: joinDateStr };
        }

        const attendance = await Attendance.find(attendanceQuery);
        const leaves = await Leave.find({ student: studentId });
        
        let settings = await Config.findById('settings');
        if (!settings) {
            settings = {
                slots: {
                    morning: { start: '09:00', end: '10:00' },
                    afternoon: { start: '13:00', end: '14:00' },
                    evening: { start: '17:00', end: '18:00' },
                },
            };
        }

        const attendanceData = attendance.map(record => applyDynamicExpiry(record.toObject(), settings));
        const leavesData = leaves
            .filter(record => !joinDateStr || record.date >= joinDateStr)
            .map(record => record.toObject());

        const totalDays = attendanceData.length;
        const presentDays = attendanceData.filter(a => a.totalStatus === 'Present').length;
        const approvedLeaves = leavesData.filter(l => l.status === 'Approved').length;
        const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

        res.json({
            attendance: attendanceData,
            leaves: leavesData,
            joinDate: joinDateStr,
            rawStats: {
                totalDays,
                presentDays,
                leaveDays: approvedLeaves,
                attendancePercentage,
            },
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
