const { db } = require('./config/db');

async function debugAlerts() {
    try {
        const studentsSnapshot = await db.collection('students').limit(5).get();
        console.log('--- Students ---');
        studentsSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`Name: ${data.fullName}, studentId: ${data.studentId}, id: ${doc.id}`);
        });

        const attendanceSnapshot = await db.collection('attendance').limit(5).get();
        console.log('\n--- Attendance ---');
        attendanceSnapshot.forEach(doc => {
            const data = doc.data();
            console.log(`studentId: ${data.studentId}, date: ${data.date}, totalStatus: ${data.totalStatus}`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugAlerts();
