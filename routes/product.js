const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get product by barcode
router.get('/:barcode', async (req, res) => {
    try {
        const product = await Product.findOne({ barcode: req.params.barcode });
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create new product mapping (Tare entry)
router.post('/', async (req, res) => {
    const product = new Product(req.body);
    try {
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
