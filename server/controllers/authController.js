const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../config/db');

// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Login user (Admin or Student)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Check Admins Collection
        const adminSnapshot = await db.collection('admins').where('username', '==', username).limit(1).get();
        let user = null;
        let userData = null;
        let role = 'admin';

        if (!adminSnapshot.empty) {
            user = adminSnapshot.docs[0];
            userData = user.data();
        } else {
            // 2. Check Students Collection
            const studentSnapshot = await db.collection('students').where('username', '==', username).limit(1).get();
            if (!studentSnapshot.empty) {
                user = studentSnapshot.docs[0];
                userData = user.data();
                role = userData.role || 'student';
            }
        }

        if (user && (await bcrypt.compare(password, userData.password))) {

            return res.json({
                _id: user.id,
                username: userData.username,
                role: role,
                token: generateToken(user.id, role),
            });
        } 
        
        // --- FALLBACK CHECK ---
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            return res.json({
                _id: 'env-admin',
                username: process.env.ADMIN_USERNAME,
                role: 'admin',
                token: generateToken('env-admin', 'admin'),
            });
        }

        res.status(401).json({ message: 'Invalid username or password' });
    } catch (error) {
        // Even if Firestore connection fails (5 NOT_FOUND), allow .env admin login
        if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            return res.json({
                _id: 'env-admin',
                username: process.env.ADMIN_USERNAME,
                role: 'admin',
                token: generateToken('env-admin', 'admin'),
            });
        }
        console.error('Login Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Login via Google
// @route   POST /api/auth/google
// @access  Public
exports.googleLogin = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // 1. Check Admins Collection
        const adminSnapshot = await db.collection('admins').where('email', '==', email).limit(1).get();
        let user = null;
        let userData = null;
        let role = 'admin';

        if (!adminSnapshot.empty) {
            user = adminSnapshot.docs[0];
            userData = user.data();
        } else {
            // 2. Check Students Collection
            const studentSnapshot = await db.collection('students').where('email', '==', email).limit(1).get();
            if (!studentSnapshot.empty) {
                user = studentSnapshot.docs[0];
                userData = user.data();
                role = userData.role || 'student';
            }
        }

        if (user) {
            return res.json({
                _id: user.id,
                username: userData.username,
                role: role,
                token: generateToken(user.id, role),
            });
        }

        res.status(401).json({ message: 'No account found with this Google email' });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ message: error.message });
    }
};
