const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const InventoryLog = require('../models/InventoryLog');

router.get('/pull', async (req, res) => {
    try {
        const lastPulledAt = parseInt(req.query.last_pulled_at || 0, 10);

        // Find changes since last pull
        const productChanges = await Product.find({ lastModifiedAt: { $gt: lastPulledAt } });
        const logChanges = await InventoryLog.find({ lastModifiedAt: { $gt: lastPulledAt } });

        // Categorize into created, updated, deleted for WatermelonDB format
        const categorize = (items) => {
            const created = [];
            const updated = [];
            const deleted = [];

            for (const i of items) {
                if (i.isDeleted) {
                    deleted.push(i.wmId);
                } else if (i.createdAt.getTime() > lastPulledAt) {
                    created.push(i);
                } else {
                    updated.push(i);
                }
            }
            return { created, updated, deleted };
        };

        const changes = {
            products: categorize(productChanges),
            inventory_logs: categorize(logChanges)
        };

        res.json({
            changes,
            timestamp: Date.now()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/push', async (req, res) => {
    try {
        const { changes } = req.body;
        const now = Date.now();

        if (changes.products) {
            for (const item of changes.products.created || []) {
                await Product.create({ ...item, lastModifiedAt: now, isDeleted: false });
            }
            for (const item of changes.products.updated || []) {
                await Product.findOneAndUpdate({ wmId: item.wmId || item.id }, { ...item, lastModifiedAt: now, isDeleted: false });
            }
            for (const id of changes.products.deleted || []) {
                await Product.findOneAndUpdate({ wmId: id }, { isDeleted: true, lastModifiedAt: now });
            }
        }

        if (changes.inventory_logs) {
            for (const item of changes.inventory_logs.created || []) {
                await InventoryLog.create({ ...item, lastModifiedAt: now, isDeleted: false });
            }
            for (const item of changes.inventory_logs.updated || []) {
                await InventoryLog.findOneAndUpdate({ wmId: item.wmId || item.id }, { ...item, lastModifiedAt: now, isDeleted: false });
            }
            for (const id of changes.inventory_logs.deleted || []) {
                await InventoryLog.findOneAndUpdate({ wmId: id }, { isDeleted: true, lastModifiedAt: now });
            }
        }

        res.status(200).send('ok');
    } catch (error) {
        console.error("Sync Push Error:", error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
