const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const tenantGuard = require('../../middleware/tenantGuard');
const { ownerOrAbove } = require('../../middleware/tenantGuard');

// All routes here require login + owner-or-above role
router.use(tenantGuard, ownerOrAbove);

// ── GET /api/owner/staff ──────────────────────────────────────────────────
// List all staff in this owner's org
router.get('/', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const staff = await User.find({
            orgId: targetOrgId,
            role: { $in: ['staff', 'manager'] }
        }).select('-password').sort({ createdAt: -1 });
        res.json(staff);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/owner/staff/invite ──────────────────────────────────────────
// Invite a new staff member (creates their account)
router.post('/invite', async (req, res) => {
    try {
        const { email, name, role, password } = req.body;
        if (!email || !name || !password) {
            return res.status(400).json({ error: 'email, name and password are required' });
        }
        if (!['staff', 'manager'].includes(role)) {
            return res.status(400).json({ error: 'Role must be "staff" or "manager"' });
        }

        // Superadmins have null orgId — fall back to the env default org
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        if (!targetOrgId) {
            return res.status(400).json({ error: 'Cannot determine which organisation to add this user to' });
        }

        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(409).json({
                error: `"${email}" already has an account. Use a different email address, or ask them to log in directly.`
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        const user = await User.create({
            email, name,
            password: hash,
            role,
            orgId: targetOrgId
        });

        res.status(201).json({
            id: user._id, email: user.email,
            name: user.name, role: user.role, orgId: user.orgId
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/owner/staff/:id/role ──────────────────────────────────────
// Change a staff member's role
router.patch('/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!['staff', 'manager'].includes(role)) {
            return res.status(400).json({ error: 'Role must be "staff" or "manager"' });
        }
        // ensure the target user belongs to the same org
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const user = await User.findOne({ _id: req.params.id, orgId: targetOrgId });
        if (!user) return res.status(404).json({ error: 'Staff member not found' });

        user.role = role;
        await user.save();
        res.json({ id: user._id, email: user.email, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/owner/staff/:id/status ────────────────────────────────────
// Activate or deactivate a staff account (soft disable)
router.patch('/:id/status', async (req, res) => {
    try {
        const { isActive } = req.body;
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const user = await User.findOneAndUpdate(
            { _id: req.params.id, orgId: targetOrgId },
            { isActive },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ error: 'Staff member not found' });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/owner/staff/:id/password ──────────────────────────────────
// Owner resets a staff member's password
router.patch('/:id/password', async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const user = await User.findOneAndUpdate(
            { _id: req.params.id, orgId: targetOrgId },
            { password: hash },
            { new: true }
        ).select('-password');
        if (!user) return res.status(404).json({ error: 'Staff member not found' });
        res.json({ message: 'Password updated', id: user._id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/owner/staff/:id ───────────────────────────────────────────
// Remove staff member from the org entirely
router.delete('/:id', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const user = await User.findOne({ _id: req.params.id, orgId: targetOrgId });
        if (!user) return res.status(404).json({ error: 'Staff member not found' });
        if (['owner', 'superadmin'].includes(user.role)) {
            return res.status(403).json({ error: 'Cannot remove an owner or superadmin' });
        }
        await user.deleteOne();
        res.json({ message: 'Staff member removed' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
