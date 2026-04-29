const express = require('express');
const router = express.Router();
const { 
    getStudents, 
    createStudent, 
    updateStudent, 
    deleteStudent, 
    resetWiFi,
    getSettings,
    updateSettings,
    getDashboardStats,
    getAttendanceAlerts,
    updateProfile,
    updateStudentRole
} = require('../controllers/adminController');
const { generateCode, getActiveCodes } = require('../controllers/attendanceCodeController');
const { protect, admin, adminOrCoAdmin } = require('../middleware/authMiddleware');

router.use(protect);
// Public/Student accessible settings (Read-only)
router.get('/settings', getSettings);

// Routes accessible by Admin or Co-Admin
router.get('/students', adminOrCoAdmin, getStudents);
router.post('/generate-code', adminOrCoAdmin, generateCode);
router.get('/active-codes', adminOrCoAdmin, getActiveCodes);

// Admin-only routes
router.use(admin);

router.post('/students', createStudent);
router.put('/students/:id', updateStudent);
router.put('/students/:id/role', updateStudentRole);
router.delete('/students/:id', deleteStudent);
router.post('/students/:id/reset-wifi', resetWiFi);
router.put('/settings', updateSettings);
router.put('/profile', updateProfile);
router.get('/dashboard-stats', getDashboardStats);
router.get('/alerts', getAttendanceAlerts);

module.exports = router;
