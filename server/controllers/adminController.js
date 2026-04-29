const bcrypt = require('bcryptjs');
const { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, isBefore, isSameDay, getYear, getMonth, parseISO } = require('date-fns');
const { db } = require('../config/db');

// @desc    Get all students
// @route   GET /api/admin/students
// @access  Admin
exports.getStudents = async (req, res) => {
    try {
        const snapshot = await db.collection('students').get();
        const students = snapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
        }));
        // Remove passwords from results
        students.forEach(s => delete s.password);
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create student
// @route   POST /api/admin/students
// @access  Admin
exports.createStudent = async (req, res) => {
    const { fullName, studentId, gender, course, house, email, mobileNumber, username, password, joinDate } = req.body;

    try {
        const usernameCheck = await db.collection('students').where('username', '==', username).get();
        if (!usernameCheck.empty) return res.status(400).json({ message: 'Username already exists' });

        const studentIdCheck = await db.collection('students').where('studentId', '==', studentId).get();
        if (!studentIdCheck.empty) return res.status(400).json({ message: 'Student ID already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const studentData = {
            fullName, studentId, gender: gender || 'Male', course, house, email, mobileNumber, username,
            password: hashedPassword,
            assignedWiFiIP: null,
            isFirstLogin: true,
            role: 'student',
            joinDate: joinDate ? new Date(joinDate).toISOString() : new Date().toISOString(),
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const docRef = await db.collection('students').add(studentData);
        res.status(201).json({ _id: docRef.id, ...studentData });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update student
// @route   PUT /api/admin/students/:id
// @access  Admin
exports.updateStudent = async (req, res) => {
    try {
        const studentRef = db.collection('students').doc(req.params.id);
        const doc = await studentRef.get();

        if (doc.exists) {
            const oldData = doc.data();
            const updates = { ...req.body, updatedAt: new Date() };
            
            // Check studentId uniqueness if changed
            if (updates.studentId && updates.studentId !== oldData.studentId) {
                const idCheck = await db.collection('students').where('studentId', '==', updates.studentId).get();
                if (!idCheck.empty) return res.status(400).json({ message: 'Student ID already exists' });
            }

            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                updates.password = await bcrypt.hash(req.body.password, salt);
            } else {
                delete updates.password;
            }
            if (updates.joinDate) {
                updates.joinDate = new Date(updates.joinDate).toISOString();
            }

            await studentRef.update(updates);

            // If studentId changed, update it in all attendance records too
            if (updates.studentId && updates.studentId !== oldData.studentId) {
                const attendanceSnapshot = await db.collection('attendance').where('student', '==', req.params.id).get();
                const batch = db.batch();
                attendanceSnapshot.docs.forEach(doc => {
                    batch.update(doc.ref, { studentId: updates.studentId });
                });
                await batch.commit();
            }

            res.json({ message: 'Student updated' });
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete student
// @route   DELETE /api/admin/students/:id
// @access  Admin
exports.deleteStudent = async (req, res) => {
    try {
        const studentRef = db.collection('students').doc(req.params.id);
        const doc = await studentRef.get();
        if (doc.exists) {
            await studentRef.delete();
            res.json({ message: 'Student removed' });
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Reset student WiFi IP
// @route   POST /api/admin/students/:id/reset-wifi
// @access  Admin
exports.resetWiFi = async (req, res) => {
    try {
        const studentRef = db.collection('students').doc(req.params.id);
        const doc = await studentRef.get();
        if (doc.exists) {
            await studentRef.update({
                assignedWiFiIP: null,
                isFirstLogin: true
            });
            res.json({ message: 'WiFi IP reset successfully' });
        } else {
            res.status(404).json({ message: 'Student not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Settings
// @route   GET /api/admin/settings
// @access  Admin
exports.getSettings = async (req, res) => {
    try {
        const settingsRef = db.collection('config').doc('settings');
        const doc = await settingsRef.get();
        
        const defaultSettings = {
            slots: {
                morning: { start: "09:00", end: "10:00" },
                afternoon: { start: "13:00", end: "14:00" },
                evening: { start: "17:00", end: "18:00" }
            }
        };

        if (!doc.exists) {
            await settingsRef.set(defaultSettings);
            return res.json(defaultSettings);
        }

        // Merge with defaults to ensure slots exist
        const data = doc.data();
        const mergedSettings = {
            ...defaultSettings,
            ...data,
            slots: {
                ...defaultSettings.slots,
                ...(data.slots || {})
            }
        };
        res.json(mergedSettings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Settings
// @route   PUT /api/admin/settings
// @access  Admin
exports.updateSettings = async (req, res) => {
    try {
        const settingsRef = db.collection('config').doc('settings');
        await settingsRef.set(req.body, { merge: true });
        res.json({ message: 'Settings updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Dashboard Stats
// @route   GET /api/admin/dashboard-stats
// @access  Admin
exports.getDashboardStats = async (req, res) => {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const studentsSnapshot = await db.collection('students').get();
        const totalStudents = studentsSnapshot.size;

        const attendanceSnapshot = await db.collection('attendance').where('date', '==', today).get();
        let presentToday = 0;
        attendanceSnapshot.forEach(doc => {
            if (doc.data().totalStatus === 'Present') presentToday++;
        });

        res.json({
            totalStudents,
            presentToday,
            absentToday: totalStudents - presentToday
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Attendance Alerts (Perfected Streak Logic)
// @route   GET /api/admin/alerts
// @access  Admin
exports.getAttendanceAlerts = async (req, res) => {
    try {
        const now = new Date();
        const selectedMonth = req.query.month ? parseInt(req.query.month) : getMonth(now) + 1;
        const selectedYear = req.query.year ? parseInt(req.query.year) : getYear(now);

        const targetMonthDate = new Date(selectedYear, selectedMonth - 1, 1);
        const monthStart = startOfMonth(targetMonthDate);
        const monthEnd = endOfMonth(targetMonthDate);

        let endCheck;
        if (selectedMonth === getMonth(now) + 1 && selectedYear === getYear(now)) {
            endCheck = now;
        } else {
            endCheck = monthEnd;
        }

        const classDays = eachDayOfInterval({ start: monthStart, end: endCheck })
            .filter(d => !isSunday(d))
            .sort((a, b) => a - b);

        const studentsSnapshot = await db.collection('students').get();
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '>=', format(monthStart, 'yyyy-MM-dd'))
            .where('date', '<=', format(monthEnd, 'yyyy-MM-dd'))
            .get();

        const attendanceMap = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            // Robust keying: Use lowercase and trimmed IDs to prevent mismatch
            const studentIdKey = data.studentId?.toString().trim().toLowerCase();
            const docIdKey = data.student?.toString().trim();
            
            [studentIdKey, docIdKey].filter(Boolean).forEach(key => {
                if (!attendanceMap[key]) attendanceMap[key] = {};
                attendanceMap[key][data.date] = data.totalStatus;
            });
        });

        const alerts = [];
        const alertThreshold = 5;

        students.forEach(student => {
            const sId = student.studentId?.toString().trim().toLowerCase();
            const docId = student.id?.toString().trim();
            const records = { ...(attendanceMap[sId] || {}), ...(attendanceMap[docId] || {}) };
            
            // Join date filtering: Only count absences AFTER the student joined
            const joinDate = student.joinDate ? new Date(student.joinDate) : (student.createdAt ? new Date(student.createdAt) : null);
            if (joinDate) joinDate.setHours(0,0,0,0);

            let currentStreak = 0;
            let lastMissedDate = null;
            let isActiveAlert = false;

            for (const day of classDays) {
                // Skip days before student joined
                if (joinDate && day < joinDate) continue;

                const dateStr = format(day, 'yyyy-MM-dd');
                const status = records[dateStr];

                if (status === "Present") {
                    currentStreak = 0;
                    isActiveAlert = false;
                } else {
                    // This counts 'Absent', 'Leave', 'Pending', and 'No Record' as days of absence for the streak
                    currentStreak++;
                    lastMissedDate = dateStr;
                    
                    if (currentStreak >= alertThreshold) {
                        isActiveAlert = true;
                    }
                }
            }

            if (isActiveAlert) {
                alerts.push({
                    ...student,
                    consecutiveDays: currentStreak,
                    lastAbsentDate: lastMissedDate || 'Ongoing Streak',
                    totalAbsences: currentStreak
                });
            }
        });

        res.json(alerts.sort((a, b) => b.consecutiveDays - a.consecutiveDays));
    } catch (error) {
        console.error('Alerts Controller Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

// @desc    Update Admin Profile
// @route   PUT /api/admin/profile
// @access  Admin
exports.updateProfile = async (req, res) => {
    const { username, password, profilePhoto } = req.body;
    const adminId = req.user.id;

    try {
        if (adminId === 'env-admin') {
            return res.status(400).json({ message: 'Environment Admin profile cannot be edited via dashboard.' });
        }

        const adminRef = db.collection('admins').doc(adminId);
        const updates = { updatedAt: new Date() };
        if (username) updates.username = username;
        if (profilePhoto) updates.profilePhoto = profilePhoto;
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(password, salt);
        }

        await adminRef.update(updates);
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update student role (Co-Admin toggle)
// @route   PUT /api/admin/students/:id/role
// @access  Admin
exports.updateStudentRole = async (req, res) => {
    const { role } = req.body;
    if (!['student', 'co-admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const studentRef = db.collection('students').doc(req.params.id);
        const doc = await studentRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (role === 'co-admin') {
            // Check if there are already 2 co-admins
            const coAdminsSnapshot = await db.collection('students').where('role', '==', 'co-admin').get();
            if (coAdminsSnapshot.size >= 2) {
                return res.status(400).json({ message: 'Maximum 2 co-admins allowed' });
            }
        }

        await studentRef.update({ role, updatedAt: new Date() });
        res.json({ message: `Student role updated to ${role}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
