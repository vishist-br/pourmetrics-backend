const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const tenantGuard = require('../middleware/tenantGuard');

// All routes here require login
router.use(tenantGuard);

// ── GET /api/pos/history ─────────────────────────────────────────────────
// Get last 20 sales for the current bar
router.get('/history', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const targetBarId = req.barId || process.env.ACTIVE_BAR_ID;

        const sales = await Sale.find({
            orgId: targetOrgId,
            barId: targetBarId
        })
            .sort({ createdAt: -1 })
            .limit(20);

        res.json(sales);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── POST /api/pos ────────────────────────────────────────────────────────
// Log a new POS Sale (scoped to org/bar)
router.post('/', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const targetBarId = req.barId || process.env.ACTIVE_BAR_ID;

        const saleData = {
            ...req.body,
            orgId: targetOrgId,
            barId: targetBarId,
            userId: req.userId || 'staff_member',
            productName: req.body.productName || 'Unknown Product'
        };

        const sale = new Sale(saleData);
        await sale.save();
        res.status(201).json(sale);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Fetch total volume sold per barcode over trailing N days
router.get('/report', async (req, res) => {
    try {
        const days = parseInt(req.query.days || 7, 10);
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        const sales = await Sale.aggregate([
            { $match: { createdAt: { $gte: dateLimit } } },
            { $group: { _id: "$bottleBarcode", totalSoldMl: { $sum: "$volumeSoldMl" }, transactions: { $sum: 1 } } }
        ]);
        res.json(sales);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
