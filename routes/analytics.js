const express = require('express');
const router = express.Router();
const InventoryLog = require('../models/InventoryLog');
const Product = require('../models/Product');

// Get volume consumed over a number of days
router.get('/usage/daily/:barId', async (req, res) => {
    try {
        const { barId } = req.params;
        const days = parseInt(req.query.days || 7, 10);

        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);

        // Fetch logs for the period
        const logs = await InventoryLog.find({
            barId,
            createdAt: { $gte: dateLimit },
            isDeleted: false
        }).sort({ createdAt: 1 });

        const bottleUsage = {};

        logs.forEach(log => {
            if (!bottleUsage[log.bottleBarcode]) {
                bottleUsage[log.bottleBarcode] = [];
            }
            bottleUsage[log.bottleBarcode].push(log.calculatedVolumeMl);
        });

        const analytics = [];
        for (const [barcode, volumes] of Object.entries(bottleUsage)) {
            // Find difference between first reading and last reading in the period
            if (volumes.length > 1) {
                const startVolume = volumes[0];
                const endVolume = volumes[volumes.length - 1];
                let consumed = startVolume - endVolume;

                // If consumed < 0 it often means a bottle was restocked.
                // A production system handles this by detecting restocks.
                if (consumed < 0) consumed = 0;

                analytics.push({
                    barcode,
                    consumedVolumeMl: consumed,
                    startingVolume: startVolume,
                    endingVolume: endVolume,
                    readingsCount: volumes.length
                });
            }
        }

        res.json({
            period: `${days} days`,
            data: analytics
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
