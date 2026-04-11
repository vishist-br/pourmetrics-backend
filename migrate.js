/**
 * migrate.js — One-time migration to add orgId to all existing documents.
 *
 * Run once: node migrate.js
 *
 * This script:
 *  1. Creates a default Organization for your existing bar
 *  2. Stamps all Products, InventoryLogs, Sales, Users, Bars with that orgId
 *
 * Safe to run multiple times — uses updateMany with $exists: false so it only
 * touches documents that don't already have an orgId.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const Organization = require('./models/Organization');
const User = require('./models/User');
const Bar = require('./models/Bar');
const Product = require('./models/Product');
const InventoryLog = require('./models/InventoryLog');
const Sale = require('./models/Sale');

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/pour_metrics';


async function migrate() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create (or find) the default Organisation
    let org = await Organization.findOne({ slug: 'default-bar' });
    if (!org) {
        org = await Organization.create({
            name: 'Default Bar',
            slug: 'default-bar',
            plan: 'pro',
            ownerEmail: 'owner@pourmetrics.app',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            isActive: true
        });
        console.log(`✅ Created default org: ${org._id}`);
    } else {
        console.log(`ℹ️  Default org already exists: ${org._id}`);
    }

    const orgId = org._id;

    // 2. Stamp all existing documents (only ones without orgId)
    const [p, i, s, u, b] = await Promise.all([
        Product.updateMany({ orgId: null }, { $set: { orgId } }),
        InventoryLog.updateMany({ orgId: null }, { $set: { orgId } }),
        Sale.updateMany({ orgId: null }, { $set: { orgId } }),
        User.updateMany({ orgId: null, role: { $ne: 'superadmin' } }, { $set: { orgId } }),
        Bar.updateMany({ orgId: null }, { $set: { orgId } })
    ]);

    console.log(`✅ Updated ${p.modifiedCount} Products`);
    console.log(`✅ Updated ${i.modifiedCount} InventoryLogs`);
    console.log(`✅ Updated ${s.modifiedCount} Sales`);
    console.log(`✅ Updated ${u.modifiedCount} Users`);
    console.log(`✅ Updated ${b.modifiedCount} Bars`);
    console.log('');
    console.log('🎉 Migration complete. Add this to your .env:');
    console.log(`DEFAULT_ORG_ID=${orgId}`);

    await mongoose.disconnect();
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
