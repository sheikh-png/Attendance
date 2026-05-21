const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

const protect = async (req, res, next) => {
    let token;

    const mongoose = require('mongoose');
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.id === 'env-admin') {
                req.user = {
                    id: 'env-admin',
                    username: process.env.ADMIN_USERNAME,
                    role: 'admin'
                };
                return next();
            }

            // Validate ObjectId before querying
            const mongoose = require('mongoose');
            if (!mongoose.Types.ObjectId.isValid(decoded.id)) {
                return res.status(401).json({ message: 'Invalid user ID format' });
            }

            let user = await Admin.findById(decoded.id).select('-password');
            let role = 'admin';

            if (!user) {
                user = await Student.findById(decoded.id).select('-password');
                if (user) {
                    role = user.role || 'student';
                }
            }

            if (!user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            req.user = user.toObject();
            req.user.id = user._id.toString();
            req.user.role = role;

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
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
