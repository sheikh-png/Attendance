const express = require('express');
const router = express.Router();
const { 
    markAttendance, 
    getDayAttendance, 
    getAllAttendance,
    getMonthlyAttendance,
    applyLeave,
    updateAttendance,
    upsertAttendanceByAdmin,
    getPendingLeaves,
    updateLeaveStatus
} = require('../controllers/attendanceController');
const { protect, admin, adminOrCoAdmin } = require('../middleware/authMiddleware');

router.post('/mark', protect, markAttendance);
router.post('/leave', protect, applyLeave);
router.post('/admin-update', protect, adminOrCoAdmin, upsertAttendanceByAdmin);

router.get('/day/:date', protect, adminOrCoAdmin, getDayAttendance);
router.get('/all', protect, admin, getAllAttendance);
router.get('/month/:year/:month', protect, admin, getMonthlyAttendance);
router.get('/leaves/pending', protect, admin, getPendingLeaves);
router.put('/leaves/:id', protect, admin, updateLeaveStatus);
router.put('/:id', protect, admin, updateAttendance);

module.exports = router;
