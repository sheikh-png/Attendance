const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    role: {
        type: String,
        default: 'admin'
    },
    profilePhoto: {
        type: String
    }
}, { timestamps: true });

module.exports = mongoose.model('Admin', AdminSchema);
