const { db } = require('./config/db');
const { eachDayOfInterval, subDays, isSunday, format, isBefore, isSameDay } = require('date-fns');

async function checkAlertsWithJoining() {
    try {
        const studentsSnapshot = await db.collection('students').get();
        const students = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const now = new Date();
        const lookbackDate = subDays(now, 45);

        const attendanceSnapshot = await db.collection('attendance')
            .where('date', '>=', format(lookbackDate, 'yyyy-MM-dd'))
            .get();

        const attendanceMap = {};
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            // Handle both string IDs and Reference objects
            const sId = data.studentId ? data.studentId.toString() : null;
            const docId = data.student ? (data.student.id || data.student.toString()) : null;
            
            [sId, docId].forEach(id => {
                if (id) {
                    if (!attendanceMap[id]) attendanceMap[id] = {};
                    attendanceMap[id][data.date] = data.totalStatus;
                }
            });
        });

        const checkDays = eachDayOfInterval({ start: lookbackDate, end: now })
            .filter(d => !isSunday(d) && (isBefore(d, now) || isSameDay(d, now)));

        const alerts = [];
        students.forEach(student => {
            let currentStreak = 0;
            const sId = student.studentId ? student.studentId.toString() : null;
            const docId = student.id.toString();

            let studentJoinedDate = lookbackDate;
            if (student.createdAt) {
                const parsed = student.createdAt.toDate ? student.createdAt.toDate() : new Date(student.createdAt);
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
