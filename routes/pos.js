const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');

// Log a new POS Sale
router.post('/', async (req, res) => {
    try {
        const sale = new Sale(req.body);
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
