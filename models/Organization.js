const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true   // e.g. "Murphy's Bar & Grill"
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true  // e.g. "murphys-bar" — used in URLs / logs
    },
    plan: {
        type: String,
        enum: ['free', 'pro', 'enterprise'],
        default: 'free'
    },
    ownerEmail: {
        type: String,
        required: true
    },
    currency: {
        type: String,
        default: 'INR'  // INR for Indian bars, USD for international
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);
