const { db } = require('./config/db');

async function test() {
    try {
        console.log('Testing Firestore Connection...');
        const res = await db.collection('test').add({ date: new Date().toISOString() });
        console.log('Success! Doc ID:', res.id);
        process.exit(0);
    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

test();
