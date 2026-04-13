const express = require('express');
const router = express.Router();
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');
const tenantGuard = require('../middleware/tenantGuard');

// All inventory routes require login
router.use(tenantGuard);

// Submit a new inventory weight reading
router.post('/', async (req, res) => {
    try {
        const { barId, bottleBarcode, measuredWeightGrams } = req.body;
        const orgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const userId = req.userId;

        // Fetch product to calculate volume instantly on backend as well
        const product = await Product.findOne({
            barcode: bottleBarcode,
            orgId: orgId
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found for that barcode' });
        }

        // Formula: Volume = Mass / SpecificGravity
        // Mass of liquid = Total measured weight - Empty Tare Weight
        let liquidMassGrams = measuredWeightGrams - product.emptyWeightGrams;

        // Ensure not negative if scale fluctuates below tare
        if (liquidMassGrams < 0) liquidMassGrams = 0;

        const calculatedVolumeMl = liquidMassGrams / product.specificGravity;

        const log = new InventoryLog({
            barId,
            bottleBarcode,
            measuredWeightGrams,
            calculatedVolumeMl,
            userId,
            wmId: 'inv_' + Date.now().toString() + '_' + Math.floor(Math.random() * 1000)
        });

        const newLog = await log.save();
        res.status(201).json(newLog);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Get Live Stock Dashboard Data based on latest logs
router.get('/live-stock/:barId', async (req, res) => {
    try {
        const orgId = req.orgId || process.env.DEFAULT_ORG_ID;
        // Find the LATEST log for each unique bottle
        const recentLogs = await InventoryLog.aggregate([
            { $match: { barId: req.params.barId, orgId: orgId } },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: "$bottleBarcode",
                    latestVolume: { $first: "$calculatedVolumeMl" },
                    latestUpdate: { $first: "$createdAt" }
                }
            }
        ]);

        res.json(recentLogs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/inventory/recent?limit=50
// Returns recent logs joined with product name for the History tab
router.get('/recent', async (req, res) => {
    try {
        const orgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const limit = parseInt(req.query.limit || 50, 10);
        const logs = await InventoryLog.find({
            orgId: orgId,
            isDeleted: false
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        // Join product names
        const barcodes = [...new Set(logs.map(l => l.bottleBarcode))];
        const products = await Product.find({
            barcode: { $in: barcodes },
            orgId: orgId
        });
        const productMap = {};
        products.forEach(p => { productMap[p.barcode] = p.productName; });

        const result = logs.map(l => ({
            _id: l._id,
            barcode: l.bottleBarcode,
            productName: productMap[l.bottleBarcode] || l.bottleBarcode,
            volumeMl: parseFloat(l.calculatedVolumeMl.toFixed(1)),
            weightGrams: l.measuredWeightGrams,
            userId: l.userId || null,
            createdAt: l.createdAt
        }));

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

