const { db } = require('./config/db');
const { format, subDays, eachDayOfInterval, isSunday, isBefore, isSameDay } = require('date-fns');

async function testSh() {
    const s = await db.collection('students').where('fullName', '==', 'sh').get();
    const student = s.docs[0].data();
    student.id = s.docs[0].id;

    console.log('Student createdAt:', student.createdAt);
    if (student.createdAt.toDate) console.log('toDate():', student.createdAt.toDate());

    const now = new Date();
    const lookbackDate = subDays(now, 45);
    const studentJoinedDate = student.createdAt?.toDate ? student.createdAt.toDate() : (student.createdAt ? new Date(student.createdAt) : lookbackDate);
    const joinedDateStr = format(studentJoinedDate, 'yyyy-MM-dd');
    console.log('Joined Date Str:', joinedDateStr);

    const checkDays = eachDayOfInterval({ start: lookbackDate, end: now })
        .filter(d => !isSunday(d) && (isBefore(d, now) || isSameDay(d, now)));

    let currentStreak = 0;
    checkDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if (dateStr >= joinedDateStr) {
            currentStreak++;
            console.log(`Checking ${dateStr}: streak ${currentStreak}`);
        }
    });

    console.log('Final currentStreak:', currentStreak);
    process.exit();
}

testSh();
