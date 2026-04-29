const { db } = require('./config/db');

async function test() {
    const snapshot = await db.collection('attendance').get();
    snapshot.forEach(doc => {
        console.log(doc.id, doc.data().date, doc.data().studentId, doc.data().totalStatus);
    });
}
test();
