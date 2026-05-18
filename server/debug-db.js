const mongoose = require('./config/db');
const Student = require('./models/Student');
const Attendance = require('./models/Attendance');

async function debugData() {
    try {
        // Wait for connection
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }

        const students = await Student.find().limit(5);
        console.log('--- Students ---');
        students.forEach(s => {
            console.log(`Name: ${s.fullName}, studentId: ${s.studentId}, id: ${s._id}`);
        });

        const attendance = await Attendance.find().limit(5);
        console.log('\n--- Attendance ---');
        attendance.forEach(a => {
            console.log(`studentId: ${a.studentId}, date: ${a.date}, totalStatus: ${a.totalStatus}`);
        });

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugData();
