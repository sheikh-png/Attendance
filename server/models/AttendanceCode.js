const mongoose = require('mongoose');

const AttendanceCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    slot: {
        type: String,
        enum: ['morning', 'afternoon', 'evening'],
        required: true
    },
    date: {
        type: String, // YYYY-MM-DD
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Auto-delete expired codes
AttendanceCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AttendanceCode', AttendanceCodeSchema);
