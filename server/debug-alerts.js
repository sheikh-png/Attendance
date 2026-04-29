const { db } = require('./config/db');
const { format, subDays, eachDayOfInterval, isSunday, isBefore, isSameDay } = require('date-fns');

async function debugAlerts() {
    try {
        console.log('--- Debugging Alerts ---');
        const studentsSnapshot = await db.collection('students').get();
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`Total Students: ${students.length}`);

        const now = new Date();
        const lookbackDate = subDays(now, 45);
        const lookbackStr = format(lookbackDate, 'yyyy-MM-dd');
        console.log(`Lookback Date: ${lookbackStr}`);

        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '>=', lookbackStr)
            .get();
        console.log(`Attendance Records Found: ${attendanceSnapshot.size}`);

        const attendanceMap = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const ids = [];
            if (data.studentId) ids.push(data.studentId.toString());
            if (data.student) {
                if (typeof data.student === 'string') ids.push(data.student);
                else if (data.student.id) ids.push(data.student.id);
            }
            
            ids.filter(Boolean).forEach(id => {
                if (!attendanceMap[id]) attendanceMap[id] = {};
                attendanceMap[id][data.date] = data.totalStatus;
            });
        });

        const checkDays = eachDayOfInterval({ start: lookbackDate, end: now })
            .filter(d => !isSunday(d) && (isBefore(d, now) || isSameDay(d, now)));
        console.log(`Days to check: ${checkDays.length}`);

        students.forEach(student => {
            console.log(`\nStudent: ${student.fullName} (${student.studentId || student.id})`);
            let currentStreak = 0;
            const sId = student.studentId ? student.studentId.toString() : null;
            const docId = student.id.toString();

            let studentJoinedDate = lookbackDate;
            if (student.createdAt) {
                if (student.createdAt.toDate) studentJoinedDate = student.createdAt.toDate();
                else if (student.createdAt._seconds) studentJoinedDate = new Date(student.createdAt._seconds * 1000);
                else {
                    const parsed = new Date(student.createdAt);
                    if (!isNaN(parsed.getTime())) studentJoinedDate = parsed;
                }
            }
            const joinedDateStr = format(studentJoinedDate, 'yyyy-MM-dd');
            console.log(`Joined: ${joinedDateStr}`);

            const streakDates = [];
            checkDays.forEach(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const status = (sId && attendanceMap[sId]?.[dateStr]) || attendanceMap[docId]?.[dateStr];

                if (status === 'Present') {
                    if (currentStreak >= 1) console.log(`  ${dateStr}: Present (Streak Reset)`);
                    currentStreak = 0;
                    streakDates.length = 0;
                } else if (status === 'Absent' || status === 'Leave' || status === 'Pending') {
                    currentStreak++;
                    streakDates.push(dateStr);
                    console.log(`  ${dateStr}: ${status} (Streak: ${currentStreak})`);
                } else if (!status) {
                    if (dateStr >= joinedDateStr) {
                        currentStreak++;
                        streakDates.push(dateStr);
                        console.log(`  ${dateStr}: No Record (Streak: ${currentStreak})`);
                    }
                }
            });

            console.log(`Final Streak for ${student.fullName}: ${currentStreak}`);
            if (currentStreak >= 5) {
                console.log(`*** ALERT: ${student.fullName} has ${currentStreak} days streak! ***`);
            }
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugAlerts();
