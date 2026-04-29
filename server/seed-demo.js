const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { db } = require('./config/db');
const { subDays, format } = require('date-fns');

dotenv.config();

const houses = ['Malhar', 'Bhairav', 'Megh'];
const names = [
    'Arjun Singh', 'Priya Sharma', 'Rahul Verma', 'Sneha Patel', 
    'Amit Kumar', 'Anjali Gupta', 'Vikram Rathore', 'Sonia Mishra',
    'Deepak Yadav', 'Kavita Reddy'
];

const seedDemoData = async () => {
    try {
        console.log('--- DEMO DATA SEEDING STARTED ---');

        // 1. Create Students
        console.log('Creating 10 Students...');
        const studentRefs = [];
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);

        for (let i = 0; i < names.length; i++) {
            const studentData = {
                fullName: names[i],
                username: `student${i + 1}`,
                password: hashedPassword,
                studentId: `STU${1000 + i}`,
                house: houses[i % houses.length],
                course: 'Computer Science',
                year: '3rd Year',
                role: 'student',
                isFirstLogin: false,
                assignedWiFiIP: '127.0.0.1',
                createdAt: new Date()
            };

            const docRef = await db.collection('students').add(studentData);
            studentRefs.push({ id: docRef.id, studentId: studentData.studentId, house: studentData.house });
            console.log(`Student Created: ${names[i]}`);
        }

        // 2. Create Attendance for last 3 days
        console.log('Creating Attendance Records for last 3 days...');
        const today = new Date();
        
        for (let d = 0; d < 3; d++) {
            const date = subDays(today, d);
            const dateStr = format(date, 'yyyy-MM-dd');
            console.log(`Processing Date: ${dateStr}`);

            for (const student of studentRefs) {
                // Randomly assign Present (80%) or Absent (20%)
                const isPresent = Math.random() > 0.2;
                const status = isPresent ? 'Present' : 'Absent';

                await db.collection('attendance').add({
                    student: student.id,
                    studentId: student.studentId,
                    date: dateStr,
                    totalStatus: status,
                    slots: {
                        morning: isPresent ? 'Present' : 'Absent',
                        afternoon: isPresent ? 'Present' : 'Absent',
                        evening: isPresent ? 'Present' : 'Absent'
                    },
                    createdAt: new Date()
                });
            }
        }

        console.log('--- DEMO DATA SEEDING COMPLETED ---');
        console.log('Credentials for Testing:');
        console.log('Username: student1, student2, ... student10');
        console.log('Password: password123');
        process.exit();
    } catch (error) {
        console.error(`Seeding Error: ${error.message}`);
        process.exit(1);
    }
};

seedDemoData();
