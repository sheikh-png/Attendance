const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. HARD FALLBACK: Check .env credentials first for emergency access
        if (username === (process.env.ADMIN_USERNAME || 'admin') && 
            password === (process.env.ADMIN_PASSWORD || 'admin123')) {
            return res.json({
                _id: 'env-admin',
                username: username,
                role: 'admin',
                token: generateToken('env-admin', 'admin'),
            });
        }

        // 2. DB CHECK: Only if Mongoose is connected
        const mongoose = require('mongoose');
        if (mongoose.connection.readyState === 1) {
            let user = await Admin.findOne({ username });
            let role = 'admin';

            if (!user) {
                user = await Student.findOne({ username });
                if (user) {
                    role = user.role || 'student';
                }
            }

            if (user && (await bcrypt.compare(password, user.password))) {
                return res.json({
                    _id: user._id,
                    username: user.username,
                    role,
                    token: generateToken(user._id, role),
                });
            }
        }

        res.status(401).json({ message: 'Invalid username or password' });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        res.json(req.user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.googleLogin = async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        let user = await Admin.findOne({ email });
        let role = 'admin';

        if (!user) {
            user = await Student.findOne({ email });
            if (user) {
                role = user.role || 'student';
            }
        }

        if (user) {
            return res.json({
                _id: user._id,
                username: user.username,
                role,
                token: generateToken(user._id, role),
            });
        }

        res.status(401).json({ message: 'No account found with this Google email' });
    } catch (error) {
        console.error('Google Login Error:', error);
        res.status(500).json({ message: error.message });
    }
};
