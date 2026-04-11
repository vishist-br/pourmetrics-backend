const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Organization = require('../../models/Organization');
const User = require('../../models/User');
const Bar = require('../../models/Bar');
const tenantGuard = require('../../middleware/tenantGuard');
const { superadminOnly } = require('../../middleware/tenantGuard');

// All routes here require a valid JWT + superadmin role
router.use(tenantGuard, superadminOnly);

// ── GET /api/superadmin/orgs ─────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const orgs = await Organization.find().sort({ createdAt: -1 });
        // Attach quick user count per org
        const orgIds = orgs.map(o => o._id);
        const userCounts = await User.aggregate([
            { $match: { orgId: { $in: orgIds } } },
            { $group: { _id: '$orgId', count: { $sum: 1 } } }
        ]);
        const countMap = {};
        userCounts.forEach(u => { countMap[u._id.toString()] = u.count; });

        res.json(orgs.map(o => ({
            ...o.toObject(),
            userCount: countMap[o._id.toString()] || 0
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/superadmin/orgs ─────────────────────────────────────────────
// Create a new organisation + its first owner account
router.post('/', async (req, res) => {
    try {
        const { name, ownerEmail, ownerPassword, ownerName, plan, currency, timezone } = req.body;
        if (!name || !ownerEmail || !ownerPassword) {
            return res.status(400).json({ error: 'name, ownerEmail and ownerPassword are required' });
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

        const org = await Organization.create({
            name, slug,
            plan: plan || 'free',
            ownerEmail,
            currency: currency || 'INR',
            timezone: timezone || 'Asia/Kolkata',
            isActive: true
        });

        // Create the initial Bar for this org
        const bar = await Bar.create({ name: name + ' — Main Bar', orgId: org._id });

        // Create owner account
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(ownerPassword, salt);
        const owner = await User.create({
            email: ownerEmail,
            password: hash,
            name: ownerName || name + ' Owner',
            role: 'owner',
            orgId: org._id
        });

        res.status(201).json({
            org,
            bar: { id: bar._id, name: bar.name },
            owner: { id: owner._id, email: owner.email, role: owner.role }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/superadmin/orgs/:id ──────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const org = await Organization.findById(req.params.id);
        if (!org) return res.status(404).json({ error: 'Org not found' });
        const users = await User.find({ orgId: org._id }).select('-password');
        const bars = await Bar.find({ orgId: org._id });
        res.json({ org, users, bars });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/superadmin/orgs/:id ────────────────────────────────────────
router.patch('/:id', async (req, res) => {
    try {
        const { name, plan, isActive, currency, timezone } = req.body;
        const org = await Organization.findByIdAndUpdate(
            req.params.id,
            {
                ...(name && { name }), ...(plan && { plan }), ...(currency && { currency }),
                ...(timezone && { timezone }), ...(isActive !== undefined && { isActive })
            },
            { new: true }
        );
        res.json(org);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/superadmin/orgs/:id ──────────────────────────────────────
// Soft delete — sets isActive: false, doesn't wipe data
router.delete('/:id', async (req, res) => {
    try {
        await Organization.findByIdAndUpdate(req.params.id, { isActive: false });
        res.json({ message: 'Organisation deactivated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
