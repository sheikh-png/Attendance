const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    studentId: {
        type: String,
        required: true
    },
    date: {
        type: String, // Format: YYYY-MM-DD
        required: true
    },
    slots: {
        morning: {
            type: String,
            enum: ['Present', 'Absent', 'Leave', 'Pending'],
            default: 'Pending'
        },
        afternoon: {
            type: String,
            enum: ['Present', 'Absent', 'Leave', 'Pending'],
            default: 'Pending'
        },
        evening: {
            type: String,
            enum: ['Present', 'Absent', 'Leave', 'Pending'],
            default: 'Pending'
        }
    },
    totalStatus: {
        type: String,
        enum: ['Present', 'Absent', 'Leave', 'Half Day', 'Pending'],
        default: 'Pending'
    }
}, { timestamps: true });

// Index for faster queries
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
