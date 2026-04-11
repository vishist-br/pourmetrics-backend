const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Product = require('./models/Product');
const InventoryLog = require('./models/InventoryLog');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    console.log("Connected to MongoDB. Wiping old data...");
    await Product.deleteMany({});
    await InventoryLog.deleteMany({});

    console.log("Seeding dummy product...");
    await Product.create({
        barcode: '123456', brandName: 'Jameson', productName: 'Jameson 750ml',
        category: 'spirits', fullWeightGrams: 1250, emptyWeightGrams: 500,
        specificGravity: 0.94, fullVolumeMl: 750, wmId: 'p1'
    });

    const weights = [1200, 1050, 800, 650, 530]; // Simulate pouring alcohol out over 5 days

    console.log("Simulating 5 weight recordings over the last week...");
    for (let i = 0; i < weights.length; i++) {
        let mass = weights[i] - 500;
        await InventoryLog.create({
            barId: '650000000000000000000000',
            bottleBarcode: '123456',
            measuredWeightGrams: weights[i],
            calculatedVolumeMl: mass / 0.94,
            userId: 'test_user',
            wmId: 'log_' + i,
            createdAt: new Date(Date.now() - (weights.length - i) * 86400000) // Spread over 5 separate days
        });
    }
    console.log("Done! Open your Admin dashboard to view the graphs!");
    process.exit(0);
}).catch(console.error);
