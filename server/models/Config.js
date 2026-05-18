const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    _id: {
        type: String,
        default: 'settings'
    },
    slots: {
        morning: {
            start: { type: String, default: '09:00' },
            end: { type: String, default: '10:00' }
        },
        afternoon: {
            start: { type: String, default: '13:00' },
            end: { type: String, default: '14:00' }
        },
        evening: {
            start: { type: String, default: '17:00' },
            end: { type: String, default: '18:00' }
        }
    },
    allowedWiFiIPs: [{
        type: String
    }]
}, { timestamps: true, _id: false });

module.exports = mongoose.model('Config', ConfigSchema);
