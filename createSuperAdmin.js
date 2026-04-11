/**
 * createSuperAdmin.js
 * Run once: node createSuperAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pour_metrics';

async function run() {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');

    const email = 'vishist.developer@gmail.com';
    const password = 'vishistPourMetrics';

    let user = await User.findOne({ email });
    if (user) {
        // Update existing account to superadmin
        user.role = 'superadmin';
        user.name = 'Vishist';
        user.orgId = null;
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();
        console.log('✅ Updated existing account to superadmin:', user._id);
    } else {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        user = await User.create({
            email,
            password: hashedPassword,
            name: 'Vishist',
            role: 'superadmin',
            orgId: null
        });
        console.log('✅ Created superadmin account:', user._id);
    }

    console.log('\n🎉 Superadmin ready:');
    console.log('   Email:   ', email);
    console.log('   Password:', password);
    console.log('   Role:    ', 'superadmin');

    await mongoose.disconnect();
}

run().catch(err => { console.error('❌', err); process.exit(1); });
