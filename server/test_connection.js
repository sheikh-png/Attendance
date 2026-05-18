const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://sheikh_db_user:rahul123@cluster0.8x87h3a.mongodb.net/Attedence?appName=Cluster0';

console.log('Testing connection to:', uri);

mongoose.connect(uri)
    .then(() => {
        console.log('Successfully connected to MongoDB');
        process.exit(0);
    })
    .catch(err => {
        console.error('Connection error details:', err);
        process.exit(1);
    });
