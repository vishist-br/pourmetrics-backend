const express = require('express');
const router = express.Router();
const InventoryLog = require('../models/InventoryLog');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const tenantGuard = require('../middleware/tenantGuard');

// All analytics routes require login
router.use(tenantGuard);

// Main analytics summary endpoint - returns everything the dashboard needs
router.get('/summary', async (req, res) => {
    try {
        let dateLimit, dateCeiling;
        const days = parseInt(req.query.days || 7, 10);
        if (req.query.from && req.query.to) {
            dateLimit = new Date(req.query.from);
            dateCeiling = new Date(req.query.to);
            dateCeiling.setHours(23, 59, 59, 999);
        } else {
            dateLimit = new Date();
            dateLimit.setDate(dateLimit.getDate() - days);
            dateCeiling = new Date();
        }

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;

        // All products for name lookups (scoped to org)
        const allProducts = await Product.find({ orgId: targetOrgId });
        const productMap = {};
        allProducts.forEach(p => {
            productMap[p.barcode] = {
                name: p.productName,
                brand: p.brandName,
                category: p.category,
                fullVolumeMl: p.fullVolumeMl
            };
        });

        // Inventory logs for the period (scoped to org)
        const logs = await InventoryLog.find({
            orgId: targetOrgId,
            createdAt: { $gte: dateLimit },
            isDeleted: false
        }).sort({ createdAt: 1 });

        const todayLogs = logs.filter(l => new Date(l.createdAt) >= todayStart);

        const bottleUsage = {};
        logs.forEach(log => {
            const bc = log.bottleBarcode;
            if (!bottleUsage[bc]) bottleUsage[bc] = [];
            bottleUsage[bc].push({ vol: log.calculatedVolumeMl, ts: log.createdAt });
        });

        const inventoryRows = [];
        for (const [barcode, entries] of Object.entries(bottleUsage)) {
            const first = entries[0].vol;
            const last = entries[entries.length - 1].vol;
            const consumed = entries.length > 1 ? Math.max(0, first - last) : 0;
            const product = productMap[barcode] || {};
            const fullVol = product.fullVolumeMl || 750;

            inventoryRows.push({
                barcode,
                productName: product.name || barcode,
                brandName: product.brand || '—',
                category: product.category || '—',
                currentVolumeMl: parseFloat(last.toFixed(1)),
                consumedVolumeMl: parseFloat(consumed.toFixed(1)),
                bottlesFull: parseFloat((last / fullVol).toFixed(2)),
                readingsCount: entries.length,
                lastScan: entries[entries.length - 1].ts
            });
        }

        // POS sales for the period (scoped to org)
        const salesRaw = await Sale.find({
            orgId: targetOrgId,
            createdAt: { $gte: dateLimit }
        });
        const todaySales = salesRaw.filter(s => new Date(s.createdAt) >= todayStart);

        const salesMap = {};
        salesRaw.forEach(s => {
            const bc = s.bottleBarcode;
            if (!salesMap[bc]) salesMap[bc] = { totalSoldMl: 0, transactions: 0 };
            salesMap[bc].totalSoldMl += s.volumeSoldMl;
            salesMap[bc].transactions += 1;
        });

        const salesRows = Object.entries(salesMap).map(([barcode, data]) => {
            const product = productMap[barcode] || {};
            return {
                barcode,
                productName: product.name || barcode,
                brandName: product.brand || '—',
                category: product.category || '—',
                totalSoldMl: parseFloat(data.totalSoldMl.toFixed(1)),
                transactions: data.transactions,
                bottlesSold: parseFloat((data.totalSoldMl / (product.fullVolumeMl || 750)).toFixed(2))
            };
        });

        // Today's summary
        const todayInventoryMl = todayLogs.reduce((s, l) => s + l.calculatedVolumeMl, 0);
        const todaySalesMl = todaySales.reduce((s, l) => s + l.volumeSoldMl, 0);
        const periodInventoryMl = logs.reduce((s, l) => s + l.calculatedVolumeMl, 0);
        const periodSalesMl = salesRaw.reduce((s, l) => s + l.volumeSoldMl, 0);

        res.json({
            period: `${days} days`,
            today: {
                inventoryMl: parseFloat(todayInventoryMl.toFixed(1)),
                salesMl: parseFloat(todaySalesMl.toFixed(1)),
                bottlesScanned: todayLogs.length,
                salesTransactions: todaySales.length
            },
            period_totals: {
                inventoryMl: parseFloat(periodInventoryMl.toFixed(1)),
                salesMl: parseFloat(periodSalesMl.toFixed(1)),
                bottlesScanned: logs.length,
                salesTransactions: salesRaw.length
            },
            inventory: inventoryRows,
            sales: salesRows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Backward-compatible endpoint
router.get('/usage/daily/:barId', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const days = parseInt(req.query.days || 7, 10);
        const dateLimit = new Date();
        dateLimit.setDate(dateLimit.getDate() - days);
        const logs = await InventoryLog.find({
            orgId: targetOrgId,
            createdAt: { $gte: dateLimit },
            isDeleted: false
        }).sort({ createdAt: 1 });
        const bottleUsage = {};
        logs.forEach(log => {
            if (!bottleUsage[log.bottleBarcode]) bottleUsage[log.bottleBarcode] = [];
            bottleUsage[log.bottleBarcode].push(log.calculatedVolumeMl);
        });
        const analytics = [];
        for (const [barcode, volumes] of Object.entries(bottleUsage)) {
            const consumed = volumes.length > 1 ? Math.max(0, volumes[0] - volumes[volumes.length - 1]) : 0;
            analytics.push({ barcode, consumedVolumeMl: consumed, currentVolumeMl: volumes[volumes.length - 1], readingsCount: volumes.length });
        }
        const sales = await Sale.aggregate([
            { $match: { orgId: targetOrgId, createdAt: { $gte: dateLimit } } },
            { $group: { _id: "$bottleBarcode", totalSoldMl: { $sum: "$volumeSoldMl" }, transactions: { $sum: 1 } } }
        ]);
        res.json({ period: `${days} days`, data: analytics, sales });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
