const mongoose = require('mongoose');

mongoose.set('strictQuery', true);

const fallbackUri = 'mongodb://sheikh_db_user:rahul123@cluster0-shard-00-00.8x87h3a.mongodb.net:27017,cluster0-shard-00-01.8x87h3a.mongodb.net:27017,cluster0-shard-00-02.8x87h3a.mongodb.net:27017/attendance?ssl=true&replicaSet=atlas-8x87h3a-shard-0&authSource=admin&retryWrites=true&w=majority';
const uri = process.env.MONGODB_URI || fallbackUri;

const connectionOptions = {
    serverSelectionTimeoutMS: 10000,
};

console.log('--- CONNECTING TO MONGODB ---');
console.log(`Using MongoDB URI: ${uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://') ? uri.split('?')[0] : uri}`);

mongoose.connect(uri, connectionOptions)
    .then(() => console.log('✅ DATABASE CONNECTED SUCCESSFULLY!'))
    .catch(err => {
        console.error('❌ DATABASE CONNECTION FAILED.');
        console.error('Error Details:', err.message);
        console.error('TIP: Confirm Atlas network access and that MONGODB_URI is correct.');
    });

module.exports = mongoose;
