const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const mongoose = require('./config/db'); // This triggers connection
const Admin = require('./models/Admin');
const Config = require('./models/Config');

dotenv.config();

const seedData = async () => {
    try {
        console.log('Seeding Data to MongoDB via Mongoose...');

        // Wait for connection
        if (mongoose.connection.readyState !== 1) {
            await new Promise(resolve => mongoose.connection.once('open', resolve));
        }

        // 1. Create Admin
        const adminCount = await Admin.countDocuments({ username: process.env.ADMIN_USERNAME || 'admin' });
        
        if (adminCount === 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', salt);

            const admin = new Admin({
                username: process.env.ADMIN_USERNAME || 'admin',
                password: hashedPassword,
                role: 'admin'
            });
            await admin.save();
            console.log('Admin seeded');
        } else {
            console.log('Admin already exists');
        }

        // 2. Create Settings
        let settings = await Config.findById('settings');

        if (!settings) {
            settings = new Config({
                _id: 'settings',
                allowedWiFiIPs: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
                slots: {
                    morning: { start: "08:00", end: "10:30" },
                    afternoon: { start: "12:00", end: "14:30" },
                    evening: { start: "16:00", end: "22:30" }
                }
            });
            await settings.save();
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
