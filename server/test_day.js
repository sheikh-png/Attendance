const { db } = require('./config/db');
const { applyDynamicExpiry } = require('./utils/attendanceUtils');

const getSettings = async () => {
    const settingsRef = db.collection('config').doc('settings');
    const settingsDoc = await settingsRef.get();
    return settingsDoc.exists ? settingsDoc.data() : { slots: { morning: { start: "09:00", end: "10:00" }, afternoon: { start: "13:00", end: "14:00" }, evening: { start: "17:00", end: "18:00" } } };
};

async function test(date) {
    const snapshot = await db.collection('attendance').where('date', '==', date).get();
    const settings = await getSettings();
    
    // Fetch all students once to avoid N+1 queries
    const studentsSnapshot = await db.collection('students').get();
    const studentsMap = {};
    studentsSnapshot.forEach(doc => {
        studentsMap[doc.id] = doc.data();
    });

    const attendance = snapshot.docs.map(doc => {
        const data = doc.data();
        const dynamicData = applyDynamicExpiry({ _id: doc.id, ...data }, settings);
        
        return {
            ...dynamicData,
            student: studentsMap[data.student] || null
        };
    });
    
    console.log(JSON.stringify(attendance, null, 2));
}
test("2026-04-28");
