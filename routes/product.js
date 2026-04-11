const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const tenantGuard = require('../middleware/tenantGuard');

// All routes here require login
router.use(tenantGuard);

// ── GET /api/products/search ─────────────────────────────────────────────
// Search products within the organization
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.json([]);

        // Search in brandName or productName (case-insensitive)
        const products = await Product.find({
            orgId: req.orgId || process.env.DEFAULT_ORG_ID,
            $or: [
                { brandName: { $regex: query, $options: 'i' } },
                { productName: { $regex: query, $options: 'i' } },
                { barcode: query }
            ]
        }).limit(10);

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── GET /api/products/:barcode ───────────────────────────────────────────
// Get product by barcode (scoped to org)
router.get('/:barcode', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const product = await Product.findOne({
            barcode: req.params.barcode,
            orgId: targetOrgId
        });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ── POST /api/products ───────────────────────────────────────────────────
// Create new product mapping (scoped to org)
router.post('/', async (req, res) => {
    try {
        const targetOrgId = req.orgId || process.env.DEFAULT_ORG_ID;
        const productData = {
            ...req.body,
            orgId: targetOrgId
        };

        const product = new Product(productData);
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Seed some test data
router.post('/seed', async (req, res) => {
    try {
        await Product.deleteMany({});
        const result = await Product.insertMany([
            {
                barcode: '123456789012',
                brandName: 'Jameson',
                productName: 'Jameson Irish Whiskey 750ml',
                category: 'spirits',
                fullWeightGrams: 1250,
                emptyWeightGrams: 500,
                specificGravity: 0.94,
                fullVolumeMl: 750
            },
            {
                barcode: '098765432109',
                brandName: 'Titos',
                productName: 'Titos Handmade Vodka 1L',
                category: 'spirits',
                fullWeightGrams: 1600,
                emptyWeightGrams: 600,
                specificGravity: 0.95,
                fullVolumeMl: 1000
            }
        ]);
        res.json(result);
    } catch (err) {
        res.status(500).json({ err });
    }
})

module.exports = router;
