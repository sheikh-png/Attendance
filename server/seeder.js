const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { db } = require('./config/db');

dotenv.config();

const seedData = async () => {
    try {
        console.log('Seeding Data to Firestore...');

        // 1. Create Admin
        const adminSnapshot = await db.collection('admins').where('username', '==', process.env.ADMIN_USERNAME || 'admin').get();
        
        if (adminSnapshot.empty) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt);

            await db.collection('admins').add({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: hashedPassword,
                role: 'admin',
                createdAt: new Date()
            });
            console.log('Admin seeded');
        } else {
            console.log('Admin already exists');
        }

        // 2. Create Settings
        const settingsRef = db.collection('config').doc('settings');
        const settingsDoc = await settingsRef.get();

        if (!settingsDoc.exists) {
            await settingsRef.set({
                allowedWiFiIPs: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
                slots: {
                    morning: { start: "08:00", end: "10:30" },
                    afternoon: { start: "12:00", end: "14:30" },
                    evening: { start: "16:00", end: "22:30" }
                }
            });
            console.log('Settings seeded');
        } else {
            console.log('Settings already exist');
        }

        console.log('Seeding Completed');
        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedData();
