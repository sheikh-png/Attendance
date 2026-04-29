const { db } = require('./config/db');
const { format, subDays, eachDayOfInterval, isSunday } = require('date-fns');

async function seedData() {
    console.log('--- Starting Attendance Seeding ---');
    
    try {
        const studentsSnapshot = await db.collection('students').get();
        if (studentsSnapshot.empty) {
            console.log('No students found to seed attendance for.');
            return;
        }

        const students = studentsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const now = new Date();
        const startDate = subDays(now, 45); // Last 45 days
        const dateRange = eachDayOfInterval({ start: startDate, end: now });

        const attendanceBatch = [];
        const leavesBatch = [];

        for (const date of dateRange) {
            const dateStr = format(date, 'yyyy-MM-dd');
            
            // SKIP SUNDAYS
            if (isSunday(date)) continue;

            for (const student of students) {
                // Randomize outcome
                const random = Math.random();
                
                if (random < 0.05) {
                    // 5% chance of Approved Leave
                    leavesBatch.push({
                        student: student.id,
                        date: dateStr,
                        reason: 'Family Emergency',
                        status: 'Approved',
                        createdAt: new Date()
                    });
                } else if (random < 0.15) {
                    // 10% chance of Absence
                    attendanceBatch.push({
                        student: student.id,
                        studentId: student.studentId,
                        date: dateStr,
                        slots: { morning: 'Absent', afternoon: 'Absent', evening: 'Absent' },
                        totalStatus: 'Absent',
                        createdAt: new Date()
                    });
                } else {
                    // 85% chance of Presence
                    attendanceBatch.push({
                        student: student.id,
                        studentId: student.studentId,
                        date: dateStr,
                        slots: { morning: 'Present', afternoon: 'Present', evening: 'Present' },
                        totalStatus: 'Present',
                        createdAt: new Date()
                    });
                }
            }
        }

        console.log(`Prepared ${attendanceBatch.length} attendance records and ${leavesBatch.length} leaves.`);

        // Writing to Firestore in chunks (batch limit is 500)
        async function commitBatches(collectionName, data) {
            let batch = db.batch();
            let count = 0;
            for (let i = 0; i < data.length; i++) {
                const docRef = db.collection(collectionName).doc();
                batch.set(docRef, data[i]);
                count++;
                
                if (count === 400 || i === data.length - 1) {
                    await batch.commit();
                    console.log(`Committed batch of ${count} to ${collectionName}`);
                    batch = db.batch();
                    count = 0;
                }
            }
        }

        await commitBatches('attendance', attendanceBatch);
        await commitBatches('leaves', leavesBatch);

        console.log('--- Seeding Completed Successfully ---');
    } catch (error) {
        console.error('Error during seeding:', error);
    }
}

seedData();
