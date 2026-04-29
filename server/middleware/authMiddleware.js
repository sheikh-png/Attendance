const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Check Fallback Admin
            if (decoded.id === 'env-admin') {
                req.user = {
                    _id: 'env-admin',
                    username: process.env.ADMIN_USERNAME,
                    role: 'admin'
                };
                return next();
            }

            // Check Firestore Admin
            let userDoc = await db.collection('admins').doc(decoded.id).get();
            let role = 'admin';

            if (!userDoc.exists) {
                // Check Student
                userDoc = await db.collection('students').doc(decoded.id).get();
                if (userDoc.exists) {
                    // Use role from document, fallback to 'student'
                    role = userDoc.data().role || 'student';
                }
            }

            if (!userDoc.exists) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            const userData = userDoc.data();
            delete userData.password;
            
            req.user = {
                _id: userDoc.id,
                ...userData,
                role
            };
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as an admin' });
    }
};

const adminOrCoAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'co-admin')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized, admin or co-admin access required' });
    }
};

module.exports = { protect, admin, adminOrCoAdmin };
