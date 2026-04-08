const express = require('express');
const router = express.Router();
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');

// Submit a new inventory weight reading
router.post('/', async (req, res) => {
    try {
        const { barId, bottleBarcode, measuredWeightGrams, userId } = req.body;

        // Fetch product to calculate volume instantly on backend as well
        const product = await Product.findOne({ barcode: bottleBarcode });
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
            userId
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
        // Find the LATEST log for each unique bottle
        // This is a simplified aggregate just for the POC
        const recentLogs = await InventoryLog.aggregate([
            { $match: { barId: req.params.barId } },
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

module.exports = router;
