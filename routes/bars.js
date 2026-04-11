const express = require('express');
const router = express.Router();
const Bar = require('../models/Bar');
const tenantGuard = require('../middleware/tenantGuard');

// GET /api/bars — returns bars for the logged-in org
// Superadmin can pass ?orgId=xxx to fetch bars for any org
router.get('/', tenantGuard, async (req, res) => {
    try {
        const orgId = (req.userRole === 'superadmin' && req.query.orgId)
            ? req.query.orgId
            : req.orgId;

        // Superadmin with no orgId filter: return all bars across all orgs
        const query = orgId ? { orgId } : {};
        const bars = await Bar.find(query).sort({ createdAt: 1 });
        res.json(bars);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/bars — owner creates a new bar in their org
router.post('/', tenantGuard, async (req, res) => {
    try {
        if (!['superadmin', 'owner'].includes(req.userRole)) {
            return res.status(403).json({ error: 'Owner access required' });
        }
        const { name, address } = req.body;
        if (!name) return res.status(400).json({ error: 'Bar name is required' });

        const bar = await Bar.create({ name, address, orgId: req.orgId });
        res.status(201).json(bar);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
