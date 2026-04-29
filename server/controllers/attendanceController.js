const { db } = require('../config/db');
const { format, isSunday } = require('date-fns');
const { calculateTotalStatus, applyDynamicExpiry } = require('../utils/attendanceUtils');

// @desc    Mark attendance for a slot
// @route   POST /api/attendance/mark
// @access  Student
exports.markAttendance = async (req, res) => {
    const { slot, isPresent = true } = req.body;
    const studentId = req.user._id;
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    if (isSunday(now)) {
        return res.status(400).json({ message: 'Attendance cannot be marked on Sundays. ENJOY!' });
    }

    try {
        const studentRef = db.collection('students').doc(studentId);
        const studentDoc = await studentRef.get();
        const studentData = studentDoc.data();

        // Fetch settings for slot windows
        const settingsRef = db.collection('config').doc('settings');
        const settingsDoc = await settingsRef.get();
        const settings = settingsDoc.exists ? settingsDoc.data() : { slots: { morning: { start: "09:00", end: "10:00" }, afternoon: { start: "13:00", end: "14:00" }, evening: { start: "17:00", end: "18:00" } } };

        // Time Window Check - Only strict for Present, allow Absent anytime
        const now = new Date();
        const currentTime = format(now, 'HH:mm');
        const slotConfig = settings.slots[slot];

        // Handle midnight-crossing slots (e.g. start: 22:00, end: 01:00)
        let isWithinWindow;
        if (slotConfig.end < slotConfig.start) {
            // Crosses midnight
            isWithinWindow = currentTime >= slotConfig.start || currentTime <= slotConfig.end;
        } else {
            isWithinWindow = currentTime >= slotConfig.start && currentTime <= slotConfig.end;
        }

        if (isPresent && !isWithinWindow) {
            return res.status(400).json({ message: 'Attendance marking window is closed for Present. You can still mark Absent.' });
        }

        // Attendance Code Verification (Only for Present)
        if (isPresent) {
            const { code } = req.body;
            if (!code) {
                return res.status(400).json({ message: 'Attendance code is required for Present status.' });
            }

            const codeSnapshot = await db.collection('attendanceCodes')
                .where('slot', '==', slot)
                .where('date', '==', today)
                .get();
            
            if (codeSnapshot.empty) {
                return res.status(404).json({ message: 'No active code found for this slot. Please contact admin.' });
            }

            const codeDoc = codeSnapshot.docs[0].data();
            const expiresAt = codeDoc.expiresAt.toDate();

            if (codeDoc.code !== code) {
                return res.status(400).json({ message: 'Invalid attendance code.' });
            }

            if (now > expiresAt) {
                return res.status(400).json({ message: 'Code expired. Please contact admin.' });
            }
        }

        // Check for existing records for this student and date
        const attendanceQuery = await db.collection('attendance')
            .where('studentId', '==', studentData.studentId)
            .where('date', '==', today)
            .limit(1)
            .get();

        let attendanceDoc;
        let attendanceData;

        if (attendanceQuery.empty) {
            attendanceData = {
                student: studentId,
                studentId: studentData.studentId,
                date: today,
                slots: { morning: 'Pending', afternoon: 'Pending', evening: 'Pending' },
                totalStatus: 'Pending',
                createdAt: new Date()
            };
            attendanceDoc = await db.collection('attendance').add(attendanceData);
            attendanceData.id = attendanceDoc.id; 
        } else {
            attendanceDoc = attendanceQuery.docs[0];
            attendanceData = { id: attendanceDoc.id, ...attendanceDoc.data() };
        }

        // Check if already marked
        if (attendanceData.slots[slot] !== 'Pending') {
            return res.status(400).json({ message: 'Attendance already marked for this slot' });
        }

        // Update Slot with Present or Absent
        const slotStatus = isPresent ? 'Present' : 'Absent';
        const updatedSlots = { ...attendanceData.slots, [slot]: slotStatus };
        
        const totalStatus = calculateTotalStatus(updatedSlots);

        await db.collection('attendance').doc(attendanceData.id).update({
            slots: updatedSlots,
            totalStatus,
            updatedAt: new Date()
        });

        res.json({ id: attendanceData.id, slots: updatedSlots, totalStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// Helper function to get settings
const getSettings = async () => {
    const settingsRef = db.collection('config').doc('settings');
    const settingsDoc = await settingsRef.get();
    return settingsDoc.exists ? settingsDoc.data() : { slots: { morning: { start: "09:00", end: "10:00" }, afternoon: { start: "13:00", end: "14:00" }, evening: { start: "17:00", end: "18:00" } } };
};

// @desc    Get day-wise attendance
// @route   GET /api/attendance/day/:date
// @access  Admin
exports.getDayAttendance = async (req, res) => {
    try {
        const snapshot = await db.collection('attendance').where('date', '==', req.params.date).get();
        const settings = await getSettings();
        
        // Fetch all students once to avoid N+1 queries
        const studentsSnapshot = await db.collection('students').get();
        const studentsMap = {};
        studentsSnapshot.forEach(doc => {
            studentsMap[doc.id] = doc.data();
        });

        const attendance = snapshot.docs.map(doc => {
            const data = doc.data();
            const dynamicData = applyDynamicExpiry({ _id: doc.id, ...data }, settings);
            
            return {
                ...dynamicData,
                student: studentsMap[data.student] || null
            };
        });

        res.json(attendance);
    } catch (error) {
        console.error('Error in getDayAttendance:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all students attendance for a range
// @route   GET /api/attendance/all
// @access  Admin
exports.getAllAttendance = async (req, res) => {
    try {
        const snapshot = await db.collection('attendance').get();
        const settings = await getSettings();
        const attendance = snapshot.docs.map(doc => applyDynamicExpiry({
            _id: doc.id,
            ...doc.data()
        }, settings));
        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Apply for leave
// @route   POST /api/attendance/leave
// @access  Student
exports.applyLeave = async (req, res) => {
    const { date, reason } = req.body;
    try {
        const leave = {
            student: req.user._id,
            date,
            reason,
            status: 'Pending',
            createdAt: new Date()
        };
        const docRef = await db.collection('leaves').add(leave);
        res.status(201).json({ id: docRef.id, ...leave });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update attendance directly
// @route   PUT /api/attendance/:id
// @access  Admin
exports.updateAttendance = async (req, res) => {
    try {
        const attendanceRef = db.collection('attendance').doc(req.params.id);
        const doc = await attendanceRef.get();
        if (doc.exists) {
            const currentData = doc.data();
            const updatedData = { ...req.body, updatedAt: new Date() };
            
            // If slots are being updated, recalculate totalStatus
            if (req.body.slots) {
                updatedData.totalStatus = calculateTotalStatus(req.body.slots);
            }

            await attendanceRef.update(updatedData);
            res.json({ message: 'Attendance updated', totalStatus: updatedData.totalStatus });
        } else {
            res.status(404).json({ message: 'Attendance not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get monthly attendance for grid
// @route   GET /api/attendance/month/:year/:month
// @access  Admin
exports.getMonthlyAttendance = async (req, res) => {
    const { year, month } = req.params;
    try {
        const start = `${year}-${month.padStart(2, '0')}-01`;
        const end = `${year}-${month.padStart(2, '0')}-31`; 

        const snapshot = await db.collection('attendance')
            .where('date', '>=', start)
            .where('date', '<=', end)
            .get();

        const settings = await getSettings();
        const attendance = snapshot.docs.map(doc => applyDynamicExpiry({
            _id: doc.id,
            ...doc.data()
        }, settings));

        res.json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// @desc    Upsert attendance by Admin
// @route   POST /api/attendance/admin-update
// @access  Admin
exports.upsertAttendanceByAdmin = async (req, res) => {
    const { studentId, date, slots } = req.body;
    
    if (isSunday(new Date(date))) {
        return res.status(400).json({ message: 'Attendance cannot be edited for Sundays. ENJOY!' });
    }

    try {
        // Find student to get document ID
        const studentQuery = await db.collection('students')
            .where('studentId', '==', studentId)
            .limit(1)
            .get();
        
        if (studentQuery.empty) {
            return res.status(404).json({ message: 'Student not found' });
        }
        
        const studentDocId = studentQuery.docs[0].id;

        const attendanceQuery = await db.collection('attendance')
            .where('studentId', '==', studentId)
            .where('date', '==', date)
            .limit(1)
            .get();

        let attendanceDoc;
        let attendanceData;

        if (attendanceQuery.empty) {
            attendanceData = {
                student: studentDocId,
                studentId: studentId,
                date: date,
                slots: slots,
                totalStatus: calculateTotalStatus(slots),
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await db.collection('attendance').add(attendanceData);
        } else {
            attendanceDoc = attendanceQuery.docs[0];
            const currentData = attendanceDoc.data();
            attendanceData = { 
                ...currentData, 
                student: studentDocId, // Ensure string ID
                studentId: studentId,  // Ensure consistent ID
                slots, 
                totalStatus: calculateTotalStatus(slots),
                updatedAt: new Date() 
            };
            await db.collection('attendance').doc(attendanceDoc.id).set(attendanceData);
        }

        res.json({ message: 'Attendance updated successfully', totalStatus: attendanceData.totalStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get pending leave requests
// @route   GET /api/attendance/leaves/pending
// @access  Admin
exports.getPendingLeaves = async (req, res) => {
    try {
        const snapshot = await db.collection('leaves')
            .where('status', '==', 'Pending')
            .get();
        
        const leaves = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const studentDoc = await db.collection('students').doc(data.student).get();
            const studentData = studentDoc.exists ? studentDoc.data() : null;
            leaves.push({
                _id: doc.id,
                ...data,
                studentName: studentData?.fullName,
                studentId: studentData?.studentId
            });
        }
        res.json(leaves);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update leave status (Approve/Reject)
// @route   PUT /api/attendance/leaves/:id
// @access  Admin
exports.updateLeaveStatus = async (req, res) => {
    const { status } = req.body; // 'Approved' or 'Rejected'
    try {
        const leaveRef = db.collection('leaves').doc(req.params.id);
        const leaveDoc = await leaveRef.get();
        
        if (!leaveDoc.exists) {
            return res.status(404).json({ message: 'Leave request not found' });
        }
        
        const leaveData = leaveDoc.data();
        await leaveRef.update({ status, updatedAt: new Date() });
        
        // If approved, update attendance record
        if (status === 'Approved') {
            const studentDoc = await db.collection('students').doc(leaveData.student).get();
            const studentId = studentDoc.data().studentId;
            
            const attendanceQuery = await db.collection('attendance')
                .where('studentId', '==', studentId)
                .where('date', '==', leaveData.date)
                .limit(1)
                .get();
            
            const attendanceData = {
                student: leaveData.student,
                studentId: studentId,
                date: leaveData.date,
                totalStatus: 'Leave',
                slots: { morning: 'Leave', afternoon: 'Leave', evening: 'Leave' },
                updatedAt: new Date()
            };

            if (attendanceQuery.empty) {
                attendanceData.createdAt = new Date();
                await db.collection('attendance').add(attendanceData);
            } else {
                await db.collection('attendance').doc(attendanceQuery.docs[0].id).set(attendanceData, { merge: true });
            }
        }
        
        res.json({ message: `Leave ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
