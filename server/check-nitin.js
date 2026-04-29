const { db } = require('./config/db');

async function checkNitin() {
    console.log('Checking Nitin...');
    const students = await db.collection('students').where('fullName', '==', 'nitin').get();
    if (students.empty) {
        console.log('Nitin not found');
        return;
    }

    const nitin = students.docs[0].data();
    const sid = nitin.studentId;
    console.log('Nitin Student ID:', sid);
    console.log('Nitin Join Date:', nitin.joinDate);

    const attendance = await db.collection('attendance').where('studentId', '==', sid).get();
    console.log('Total Attendance Records for Nitin:', attendance.size);
    
    const sorted = attendance.docs.map(d => d.data()).sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach(data => {
        console.log(`Date: ${data.date}, Status: ${data.totalStatus}`);
    });
    process.exit(0);
}

checkNitin().catch(err => {
    console.error(err);
    process.exit(1);
});
