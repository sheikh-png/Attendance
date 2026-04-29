const { db } = require('./config/db');
const { eachDayOfInterval, subDays, isSunday, format, isBefore, isSameDay } = require('date-fns');

async function checkAlerts() {
    try {
        const studentsSnapshot = await db.collection('students').get();
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const now = new Date();
        const lookbackDate = subDays(now, 45);
        const lookbackStr = format(lookbackDate, 'yyyy-MM-dd');

        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '>=', lookbackStr)
            .get();

        const attendanceMap = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            const sId = (data.studentId || '').toString();
            const docId = (data.student || '').toString();
            
            if (sId) {
                if (!attendanceMap[sId]) attendanceMap[sId] = {};
                attendanceMap[sId][data.date] = data.totalStatus;
            }
            if (docId) {
                if (!attendanceMap[docId]) attendanceMap[docId] = {};
                attendanceMap[docId][data.date] = data.totalStatus;
            }
        });

        const checkDays = eachDayOfInterval({ start: lookbackDate, end: now })
            .filter(d => !isSunday(d) && (isBefore(d, now) || isSameDay(d, now)));

        const alerts = [];
        students.forEach(student => {
            let currentStreak = 0;
            const sId = (student.studentId || '').toString();
            const docId = student.id.toString();

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
