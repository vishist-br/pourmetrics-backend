const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'pourmetrics_secret_123';

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, role, name, orgId } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ error: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            email,
            password: hashedPassword,
            name: name || '',
            role: role || 'owner',
            orgId: orgId || null
        });

        await user.save();

        const payload = { id: user._id, role: user.role, email: user.email, name: user.name, orgId: user.orgId };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({ token, user: payload });
    } catch (err) {
        res.status(500).json({ error: 'Server error parsing registration' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

        const payload = { id: user._id, role: user.role, email: user.email, name: user.name, orgId: user.orgId };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: payload });
    } catch (err) {
        res.status(500).json({ error: 'Server error parsing login' });
    }
});

// GET /api/auth/users (Fetch all accounts for Owner)
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching users' });
    }
});

// PATCH /api/auth/users/:id/role (Modify user role)
router.patch('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['owner', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: 'Server error modifying role' });
    }
});

module.exports = router;
