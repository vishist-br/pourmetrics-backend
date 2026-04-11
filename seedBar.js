/**
 * seedBar.js - Run once: node seedBar.js
 * Creates "PourMetrics Default Bar" linked to the default org,
 * then backfills barId on all existing Products, InventoryLogs and Sales.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Organization = require('./models/Organization');
const Bar = require('./models/Bar');
const Product = require('./models/Product');
const InventoryLog = require('./models/InventoryLog');
const Sale = require('./models/Sale');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pour_metrics';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find the default org (the one the migration created)
    let org = await Organization.findOne({ isActive: true });
    if (!org) {
        console.error('❌ No active organisation found. Run migrate.js first.');
        process.exit(1);
    }
    console.log(`✅ Using org: "${org.name}" (${org._id})`);

    // 2. Create bar if not already there
    let bar = await Bar.findOne({ orgId: org._id });
    if (bar) {
        console.log(`ℹ️  Bar already exists: "${bar.name}" (${bar._id})`);
    } else {
        bar = await Bar.create({
            name: org.name + ' — Main Bar',
            orgId: org._id,
            settings: { currency: org.currency || 'INR', measurementUnit: 'ml' }
        });
        console.log(`✅ Created bar: "${bar.name}" (${bar._id})`);
    }

    // 3. Backfill barId on all documents that belong to this org and have no barId
    const orgId = org._id;
    const barId = bar._id;

    const [prods, logs, sales] = await Promise.all([
        Product.updateMany(
            { orgId, $or: [{ barId: null }, { barId: { $exists: false } }] },
            { $set: { barId } }
        ),
        InventoryLog.updateMany(
            { orgId, $or: [{ barId: null }, { barId: { $exists: false } }] },
            { $set: { barId } }
        ),
        Sale.updateMany(
            { orgId, $or: [{ barId: null }, { barId: { $exists: false } }] },
            { $set: { barId } }
        ),
    ]);

    console.log(`✅ Updated ${prods.modifiedCount} Products`);
    console.log(`✅ Updated ${logs.modifiedCount}  InventoryLogs`);
    console.log(`✅ Updated ${sales.modifiedCount} Sales`);

    console.log(`\n🎉 Done! Add to your .env:\nACTIVE_BAR_ID=${barId}`);

    await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
