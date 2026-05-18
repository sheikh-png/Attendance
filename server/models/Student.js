const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    studentId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other'],
        default: 'Male'
    },
    course: {
        type: String,
        trim: true
    },
    house: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    mobileNumber: {
        type: String,
        trim: true
    },
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
    assignedWiFiIP: {
        type: String,
        default: null
    },
    isFirstLogin: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['student', 'co-admin'],
        default: 'student'
    },
    joinDate: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Student', StudentSchema);
