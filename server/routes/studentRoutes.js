const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { applyDynamicExpiry } = require('../utils/attendanceUtils');

router.use(protect);

// @desc    Get student dashboard stats
// @route   GET /api/student/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const attendanceSnapshot = await db.collection('attendance')
            .where('student', '==', req.user._id)
            .get();
        
        const leavesSnapshot = await db.collection('leaves')
            .where('student', '==', req.user._id)
            .get();
        
        const settingsRef = await db.collection('config').doc('settings').get();
        const settings = settingsRef.exists ? settingsRef.data() : { slots: { morning: { start: "09:00", end: "10:00" }, afternoon: { start: "13:00", end: "14:00" }, evening: { start: "17:00", end: "18:00" } } };

        const attendance = attendanceSnapshot.docs.map(doc => applyDynamicExpiry({ _id: doc.id, ...doc.data() }, settings));
        const leaves = leavesSnapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
        
        // Calculate stats
        const totalDays = attendance.length;
        const presentDays = attendance.filter(a => a.totalStatus === 'Present').length;
        const approvedLeaves = leaves.filter(l => l.status === 'Approved').length;
        const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

        res.json({
            attendance,
            leaves,
            rawStats: {
                totalDays,
                presentDays,
                leaveDays: approvedLeaves,
                attendancePercentage
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
