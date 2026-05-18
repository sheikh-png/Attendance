const mongoose = require('./config/db');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');
const { eachDayOfInterval, subDays, isSunday, format, isBefore, isSameDay } = require('date-fns');

async function checkAlerts() {
    try {
        // Wait for connection
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }

        const students = await Student.find();

        const now = new Date();
        const lookbackDate = subDays(now, 45);
        const lookbackStr = format(lookbackDate, 'yyyy-MM-dd');

        const attendance = await Attendance.find({ date: { $gte: lookbackStr } });

        const attendanceMap = {};
        attendance.forEach(record => {
            const sId = (record.studentId || '').toString();
            const docId = (record.student || '').toString();
            
            if (sId) {
                if (!attendanceMap[sId]) attendanceMap[sId] = {};
                attendanceMap[sId][record.date] = record.totalStatus;
            }
            if (docId) {
                if (!attendanceMap[docId]) attendanceMap[docId] = {};
                attendanceMap[docId][record.date] = record.totalStatus;
            }
        });

        const checkDays = eachDayOfInterval({ start: lookbackDate, end: now })
            .filter(d => !isSunday(d) && (isBefore(d, now) || isSameDay(d, now)));

        const alerts = [];
        students.forEach(student => {
            let currentStreak = 0;
            const sId = (student.studentId || '').toString();
            const docId = student._id.toString();

            checkDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = (sId && attendanceMap[sId]?.[dateStr]) || attendanceMap[docId]?.[dateStr];

                if (status === 'Present') {
                    currentStreak = 0;
                } else {
                    currentStreak++;
                }
            });

            if (currentStreak >= 5) {
                alerts.push({ name: student.fullName, streak: currentStreak });
            }
        });

        console.log(`Found ${alerts.length} alerts:`);
        alerts.forEach(a => console.log(`- ${a.name}: ${a.streak} days`));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAlerts();
