const { format, isBefore, isSameDay } = require('date-fns');

const calculateTotalStatus = (slots) => {
    const values = Object.values(slots);

    // If any slot is still pending, the main status remains pending
    if (values.includes('Pending')) return 'Pending';
    
    // Leave logic (assuming 2 leaves means overall leave)
    const leaveCount = values.filter(s => s === 'Leave').length;
    if (leaveCount >= 2) return 'Leave';
    
    // If all slots are resolved, require at least 2 Present slots to mark as Present
    const presentCount = values.filter(s => s === 'Present').length;
    if (presentCount >= 2) return 'Present';
    
    // Otherwise it's Absent
    return 'Absent';
};

const applyDynamicExpiry = (attendanceRecord, settings) => {
    const now = new Date();

    let slotsUpdated = false;
    const newSlots = { ...attendanceRecord.slots };

    // Ensure all slots are at least present in the object
    ['morning', 'afternoon', 'evening'].forEach(slot => {
        if (!newSlots[slot]) {
            newSlots[slot] = 'Pending';
        }
    });

    const [year, month, day] = attendanceRecord.date.split('-').map(Number);

    ['morning', 'afternoon', 'evening'].forEach(slot => {
        if (newSlots[slot] === 'Pending') {
            const slotConfig = settings.slots[slot];
            
            const [endH, endM] = slotConfig.end.split(':').map(Number);
            const slotEnd = new Date(year, month - 1, day, endH, endM, 0, 0);
            
            // Handle cross-midnight slots
            if (slotConfig.end < slotConfig.start) {
                slotEnd.setDate(slotEnd.getDate() + 1);
            }
            
            // If current time has passed the end of the slot window, it expires
            if (now > slotEnd) {
                newSlots[slot] = 'Absent';
            }
        }
    });

    attendanceRecord.slots = newSlots;
    attendanceRecord.totalStatus = calculateTotalStatus(newSlots);
    
    return attendanceRecord;
};

module.exports = { calculateTotalStatus, applyDynamicExpiry };
