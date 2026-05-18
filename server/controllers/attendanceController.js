const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Config = require('../models/Config');
const Leave = require('../models/Leave');
const AttendanceCode = require('../models/AttendanceCode');
const { format, isSunday } = require('date-fns');
const { calculateTotalStatus, applyDynamicExpiry } = require('../utils/attendanceUtils');

const getSettings = async () => {
    let settings = await Config.findById('settings');
    if (!settings) {
        return {
            slots: {
                morning: { start: '09:00', end: '10:00' },
                afternoon: { start: '13:00', end: '14:00' },
                evening: { start: '17:00', end: '18:00' },
            },
        };
    }
    return settings;
};

exports.markAttendance = async (req, res) => {
    const { slot, isPresent = true } = req.body;
    const studentId = req.user.id;
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    if (isSunday(now)) {
        return res.status(400).json({ message: 'Attendance cannot be marked on Sundays. ENJOY!' });
    }

    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const settings = await getSettings();
        const currentTime = format(now, 'HH:mm');
        const slotConfig = settings.slots[slot];

        let isWithinWindow;
        if (slotConfig.end < slotConfig.start) {
            isWithinWindow = currentTime >= slotConfig.start || currentTime <= slotConfig.end;
        } else {
            isWithinWindow = currentTime >= slotConfig.start && currentTime <= slotConfig.end;
        }

        if (isPresent && !isWithinWindow) {
            return res.status(400).json({ message: 'Attendance marking window is closed for Present. You can still mark Absent.' });
        }

        if (isPresent) {
            const { code } = req.body;
            if (!code) {
                return res.status(400).json({ message: 'Attendance code is required for Present status.' });
            }

            const codeDoc = await AttendanceCode.findOne({ slot, date: today });
            if (!codeDoc) {
                return res.status(404).json({ message: 'No active code found for this slot. Please contact admin.' });
            }

            if (codeDoc.code !== code) {
                return res.status(400).json({ message: 'Invalid attendance code.' });
            }

            if (now > codeDoc.expiresAt) {
                return res.status(400).json({ message: 'Code expired. Please contact admin.' });
            }
        }

        let attendanceRecord = await Attendance.findOne({ studentId: student.studentId, date: today });

        if (!attendanceRecord) {
            attendanceRecord = new Attendance({
                student: studentId,
                studentId: student.studentId,
                date: today,
                slots: { morning: 'Pending', afternoon: 'Pending', evening: 'Pending' },
                totalStatus: 'Pending'
            });
        }

        if (attendanceRecord.slots[slot] !== 'Pending') {
            return res.status(400).json({ message: 'Attendance already marked for this slot' });
        }

        const slotStatus = isPresent ? 'Present' : 'Absent';
        attendanceRecord.slots[slot] = slotStatus;
        attendanceRecord.totalStatus = calculateTotalStatus(attendanceRecord.slots);

        await attendanceRecord.save();

        res.json({ id: attendanceRecord._id, slots: attendanceRecord.slots, totalStatus: attendanceRecord.totalStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.getDayAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find({ date: req.params.date }).populate('student', '-password');
        const settings = await getSettings();

        const response = attendance.map(record => {
            return applyDynamicExpiry(record.toObject(), settings);
        });

        res.json(response);
    } catch (error) {
        console.error('Error in getDayAttendance:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getAllAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.find();
        const settings = await getSettings();
        res.json(attendance.map(record => applyDynamicExpiry(record.toObject(), settings)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.applyLeave = async (req, res) => {
    const { date, reason } = req.body;
    try {
        const leave = new Leave({
            student: req.user.id,
            date,
            reason,
            status: 'Pending'
        });
        await leave.save();
        res.status(201).json(leave);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findById(req.params.id);
        if (!attendance) {
            return res.status(404).json({ message: 'Attendance not found' });
        }

        const updates = { ...req.body };
        if (req.body.slots) {
            attendance.slots = req.body.slots;
            attendance.totalStatus = calculateTotalStatus(req.body.slots);
        }

        Object.assign(attendance, updates);
        await attendance.save();

        res.json({ message: 'Attendance updated', totalStatus: attendance.totalStatus });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMonthlyAttendance = async (req, res) => {
    const { year, month } = req.params;
    try {
        const start = `${year}-${month.padStart(2, '0')}-01`;
        const end = `${year}-${month.padStart(2, '0')}-31`;

        const attendance = await Attendance.find({ date: { $gte: start, $lte: end } });
        const settings = await getSettings();
        res.json(attendance.map(record => applyDynamicExpiry(record.toObject(), settings)));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.upsertAttendanceByAdmin = async (req, res) => {
    const { studentId, date, slots } = req.body;

    if (isSunday(new Date(date))) {
        return res.status(400).json({ message: 'Attendance cannot be edited for Sundays. ENJOY!' });
    }

    try {
        const student = await Student.findOne({ studentId });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let attendance = await Attendance.findOne({ studentId, date });
        
        if (!attendance) {
            attendance = new Attendance({
                student: student._id,
                studentId,
                date,
                slots,
                totalStatus: calculateTotalStatus(slots)
            });
        } else {
            attendance.slots = slots;
            attendance.totalStatus = calculateTotalStatus(slots);
        }

        await attendance.save();
        res.json({ message: 'Attendance updated successfully', totalStatus: attendance.totalStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

exports.getPendingLeaves = async (req, res) => {
    try {
        const leaves = await Leave.find({ status: 'Pending' }).populate('student', 'fullName studentId');
        const response = leaves.map(leave => ({
            ...leave.toObject(),
            studentName: leave.student?.fullName || null,
            studentId: leave.student?.studentId || null,
        }));

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateLeaveStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const leave = await Leave.findById(req.params.id);
        if (!leave) {
            return res.status(404).json({ message: 'Leave request not found' });
        }

        leave.status = status;
        await leave.save();

        if (status === 'Approved') {
            const student = await Student.findById(leave.student);
            let attendance = await Attendance.findOne({ studentId: student.studentId, date: leave.date });
            
            if (!attendance) {
                attendance = new Attendance({
                    student: leave.student,
                    studentId: student.studentId,
                    date: leave.date,
                    totalStatus: 'Leave',
                    slots: { morning: 'Leave', afternoon: 'Leave', evening: 'Leave' }
                });
            } else {
                attendance.totalStatus = 'Leave';
                attendance.slots = { morning: 'Leave', afternoon: 'Leave', evening: 'Leave' };
            }
            await attendance.save();
        }

        res.json({ message: `Leave ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
