const express = require('express');
const router = express.Router();
const Organization = require('../../models/Organization');
const User = require('../../models/User');
const bcrypt = require('bcryptjs');

// Superadmin-only guard
function superadminOnly(req, res, next) {
    if (req.userRole !== 'superadmin') {
        return res.status(403).json({ error: 'Superadmin access required' });
    }
    next();
}

// GET /api/admin/orgs — list all organizations
router.get('/', superadminOnly, async (req, res) => {
    try {
        const orgs = await Organization.find().sort({ createdAt: -1 });
        res.json(orgs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/admin/orgs — create a new customer organization + owner account
router.post('/', superadminOnly, async (req, res) => {
    try {
        const { name, ownerEmail, ownerPassword, plan, currency, timezone } = req.body;
        if (!name || !ownerEmail || !ownerPassword) {
            return res.status(400).json({ error: 'name, ownerEmail, and ownerPassword are required' });
        }

        // Generate a URL-safe slug from the name
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

        const org = await Organization.create({
            name,
            slug,
            plan: plan || 'free',
            ownerEmail,
            currency: currency || 'INR',
            timezone: timezone || 'Asia/Kolkata',
            isActive: true
        });

        // Create the owner User linked to this org
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ownerPassword, salt);
        const owner = await User.create({
            email: ownerEmail,
            password: hashedPassword,
            name: name + ' Owner',
            role: 'owner',
            orgId: org._id
        });

        res.status(201).json({
            org,
            owner: { id: owner._id, email: owner.email, role: owner.role, orgId: org._id }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/admin/orgs/:id/status — activate or deactivate an org
router.patch('/:id/status', superadminOnly, async (req, res) => {
    try {
        const { isActive } = req.body;
        const org = await Organization.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
        res.json(org);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
