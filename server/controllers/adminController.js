const bcrypt = require('bcryptjs');
const { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, getYear, getMonth } = require('date-fns');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Config = require('../models/Config');
const Admin = require('../models/Admin');

exports.getStudents = async (req, res) => {
    try {
        const students = await Student.find().select('-password');
        res.json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createStudent = async (req, res) => {
    const { fullName, studentId, gender, course, house, email, mobileNumber, username, password, joinDate } = req.body;

    try {
        const existingUsername = await Student.findOne({ username });
        if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

        const existingStudentId = await Student.findOne({ studentId });
        if (existingStudentId) return res.status(400).json({ message: 'Student ID already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const student = new Student({
            fullName,
            studentId,
            gender: gender || 'Male',
            course,
            house,
            email,
            mobileNumber,
            username,
            password: hashedPassword,
            joinDate: joinDate ? new Date(joinDate) : new Date()
        });

        await student.save();
        res.status(201).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const updates = { ...req.body };

        if (updates.studentId && updates.studentId !== student.studentId) {
            const idCheck = await Student.findOne({ studentId: updates.studentId });
            if (idCheck) return res.status(400).json({ message: 'Student ID already exists' });
        }

        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            updates.password = await bcrypt.hash(req.body.password, salt);
        } else {
            delete updates.password;
        }

        if (updates.joinDate) {
            updates.joinDate = new Date(updates.joinDate);
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { new: true }
        );

        if (updates.studentId && updates.studentId !== student.studentId) {
            await Attendance.updateMany(
                { student: req.params.id },
                { $set: { studentId: updates.studentId } }
            );
        }

        res.json({ message: 'Student updated', student: updatedStudent });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        await Student.findByIdAndDelete(req.params.id);
        // Also cleanup attendance
        await Attendance.deleteMany({ student: req.params.id });
        
        res.json({ message: 'Student removed' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.resetWiFi = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        student.assignedWiFiIP = null;
        student.isFirstLogin = true;
        await student.save();

        res.json({ message: 'WiFi IP reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getSettings = async (req, res) => {
    try {
        const defaultSettings = {
            slots: {
                morning: { start: '09:00', end: '10:00' },
                afternoon: { start: '13:00', end: '14:00' },
                evening: { start: '17:00', end: '18:00' },
            },
            allowedWiFiIPs: []
        };

        let settings = await Config.findById('settings');
        if (!settings) {
            settings = new Config({ _id: 'settings', ...defaultSettings });
            await settings.save();
        }

        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSettings = async (req, res) => {
    try {
        const settings = await Config.findByIdAndUpdate(
            'settings',
            { $set: req.body },
            { upsert: true, new: true }
        );
        res.json({ message: 'Settings updated', settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getDashboardStats = async (req, res) => {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const totalStudents = await Student.countDocuments();
        const presentToday = await Attendance.countDocuments({ date: today, totalStatus: 'Present' });

        res.json({
            totalStudents,
            presentToday,
            absentToday: totalStudents - presentToday,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

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

        const students = await Student.find();
        const attendance = await Attendance.find({
            date: { $gte: format(monthStart, 'yyyy-MM-dd'), $lte: format(monthEnd, 'yyyy-MM-dd') },
        });

        const attendanceMap = {};
        attendance.forEach(record => {
            const studentIdKey = record.studentId?.toString().trim().toLowerCase();
            const docIdKey = record.student?.toString().trim();

            [studentIdKey, docIdKey].filter(Boolean).forEach(key => {
                if (!attendanceMap[key]) attendanceMap[key] = {};
                attendanceMap[key][record.date] = record.totalStatus;
            });
        });

        const alerts = [];
        const alertThreshold = 5;

        students.forEach(student => {
            const sId = student.studentId?.toString().trim().toLowerCase();
            const docId = student._id.toString();
            const records = { ...(attendanceMap[sId] || {}), ...(attendanceMap[docId] || {}) };
            const joinDate = student.joinDate ? new Date(student.joinDate) : null;
            if (joinDate) joinDate.setHours(0, 0, 0, 0);

            let currentStreak = 0;
            let lastMissedDate = null;
            let isActiveAlert = false;

            for (const day of classDays) {
                if (joinDate && day < joinDate) continue;
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = records[dateStr];

                if (status === 'Present') {
                    currentStreak = 0;
                    isActiveAlert = false;
                } else {
                    currentStreak++;
                    lastMissedDate = dateStr;

                    if (currentStreak >= alertThreshold) {
                        isActiveAlert = true;
                    }
                }
            }

            if (isActiveAlert) {
                alerts.push({
                    _id: student._id,
                    ...student.toObject(),
                    consecutiveDays: currentStreak,
                    lastAbsentDate: lastMissedDate || 'Ongoing Streak',
                    totalAbsences: currentStreak,
                });
            }
        });

        res.json(alerts.sort((a, b) => b.consecutiveDays - a.consecutiveDays));
    } catch (error) {
        console.error('Alerts Controller Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

exports.updateProfile = async (req, res) => {
    const { username, password, profilePhoto } = req.body;
    const adminId = req.user.id;

    try {
        if (adminId === 'env-admin') {
            return res.status(400).json({ message: 'Environment Admin profile cannot be edited via dashboard.' });
        }

        const admin = await Admin.findById(adminId);
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (username) admin.username = username;
        if (profilePhoto) admin.profilePhoto = profilePhoto;

        if (password) {
            const salt = await bcrypt.genSalt(10);
            admin.password = await bcrypt.hash(password, salt);
        }

        await admin.save();
        res.json({ message: 'Profile updated' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateStudentRole = async (req, res) => {
    const { role } = req.body;
    if (!['student', 'co-admin'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (role === 'co-admin') {
            const coAdminCount = await Student.countDocuments({ role: 'co-admin' });
            if (coAdminCount >= 2) {
                return res.status(400).json({ message: 'Maximum 2 co-admins allowed' });
            }
        }

        student.role = role;
        await student.save();

        res.json({ message: `Student role updated to ${role}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
