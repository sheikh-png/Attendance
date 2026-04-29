const { db } = require('../config/db');
const { format, addMinutes } = require('date-fns');

// @desc    Generate a random 6-digit numeric code
// @route   POST /api/admin/generate-code
// @access  Admin
exports.generateCode = async (req, res) => {
    const { slot } = req.body;
    if (!['morning', 'afternoon', 'evening'].includes(slot)) {
        return res.status(400).json({ message: 'Invalid slot' });
    }

    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const now = new Date();
        const expiresAt = addMinutes(now, 20);
        const today = format(now, 'yyyy-MM-dd');

        const codeData = {
            slot,
            code,
            date: today,
            expiresAt: expiresAt,
            createdAt: now,
            isActive: true
        };

        // Store code in a dedicated collection 'attendanceCodes'
        // We overwrite any existing code for the same slot and date to keep it clean
        const existingCodes = await db.collection('attendanceCodes')
            .where('slot', '==', slot)
            .where('date', '==', today)
            .get();
        
        const batch = db.batch();
        existingCodes.forEach(doc => batch.delete(doc.ref));
        
        const newCodeRef = db.collection('attendanceCodes').doc();
        batch.set(newCodeRef, codeData);
        await batch.commit();

        res.json({ 
            message: `Code generated for ${slot}`, 
            code, 
            expiresAt: format(expiresAt, 'HH:mm:ss') 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get active codes for today
// @route   GET /api/admin/active-codes
// @access  Admin
exports.getActiveCodes = async (req, res) => {
    try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const snapshot = await db.collection('attendanceCodes')
            .where('date', '==', today)
            .get();
        
        const codes = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            // Convert Firestore Timestamp to JS Date
            const expiresAt = data.expiresAt.toDate();
            const now = new Date();
            
            if (now < expiresAt) {
                codes[data.slot] = {
                    code: data.code,
                    expiresAt: format(expiresAt, 'HH:mm:ss'),
                    timeLeft: Math.round((expiresAt - now) / 1000 / 60)
                };
            }
        });

        res.json(codes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
