const { db } = require('./config/db');
const { eachDayOfInterval, subDays, isSunday, format, isBefore, isSameDay } = require('date-fns');

async function checkAlertsWithJoining() {
    try {
        const students = await db.collection('students').find().toArray();

        const now = new Date();
        const lookbackDate = subDays(now, 45);

        const attendance = await db.collection('attendance')
            .find({ date: { $gte: format(lookbackDate, 'yyyy-MM-dd') } })
            .toArray();

        const attendanceMap = {};
        attendance.forEach(record => {
            const sId = record.studentId ? record.studentId.toString() : null;
            const docId = record.student ? record.student.toString() : null;
            
            [sId, docId].forEach(id => {
                if (id) {
                    if (!attendanceMap[id]) attendanceMap[id] = {};
                    attendanceMap[id][record.date] = record.totalStatus;
                }
            });
        });

        const checkDays = eachDayOfInterval({ start: lookbackDate, end: now })
            .filter(d => !isSunday(d) && (isBefore(d, now) || isSameDay(d, now)));

        const alerts = [];
        students.forEach(student => {
            let currentStreak = 0;
            const sId = student.studentId ? student.studentId.toString() : null;
            const docId = student._id.toString();

            let studentJoinedDate = lookbackDate;
            if (student.createdAt) {
                const parsed = new Date(student.createdAt);
                if (!isNaN(parsed.getTime())) studentJoinedDate = parsed;
            }
            const joinedDateStr = format(studentJoinedDate, 'yyyy-MM-dd');

            checkDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = (sId && attendanceMap[sId]?.[dateStr]) || attendanceMap[docId]?.[dateStr];

                if (status === 'Present') {
                    currentStreak = 0;
                } else {
                    if (dateStr >= joinedDateStr) {
                        currentStreak++;
                    }
                }
            });

            if (currentStreak >= 5) {
                alerts.push({ name: student.fullName, streak: currentStreak, joined: joinedDateStr });
            }
        });

        console.log(`Found ${alerts.length} alerts:`);
        alerts.forEach(a => console.log(`- ${a.name}: ${a.streak} days (Joined: ${a.joined})`));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkAlertsWithJoining();
