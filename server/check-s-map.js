const { db } = require('./config/db');
const { format, subDays } = require('date-fns');

async function checkSMap() {
    const now = new Date();
    const lookbackDate = subDays(now, 45);
    const attendanceSnapshot = await db.collection('attendance')
        .where('date', '>=', format(lookbackDate, 'yyyy-MM-dd'))
        .get();

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

    console.log('--- Student s (2026) ---');
    console.log('Manual ID Map (2026):', attendanceMap['2026']);
    console.log('Doc ID Map (kvoRQJccjHPVRrKv9sVL):', attendanceMap['kvoRQJccjHPVRrKv9sVL']);
    process.exit();
}

checkSMap();
