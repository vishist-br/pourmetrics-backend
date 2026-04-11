const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null      // backfilled by migration script
    },
    barcode: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    brandName: {
        type: String,
        required: true
    },
    productName: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['spirits', 'wine', 'beer', 'cider', 'mixer', 'other'],
        default: 'spirits'
    },
    subCategory: {
        type: String,      // e.g. 'Irish Whiskey', 'IPA', 'Cabernet Sauvignon'
        default: ''
    },
    fullWeightGrams: {
        type: Number,
        required: true
    },
    emptyWeightGrams: {
        type: Number,      // Tare weight
        required: true
    },
    specificGravity: {
        type: Number,      // Density of the liquid
        default: 1.0
    },
    fullVolumeMl: {
        type: Number,
        required: true
    },
    abv: {
        type: Number,      // Alcohol % e.g. 43.0 for Jameson
        default: 0
    },
    costPrice: {
        type: Number,      // Purchase price per bottle (₹/$)
        default: 0
    },
    mrp: {
        type: Number,      // Selling / retail price per bottle (₹/$)
        default: 0
    },
    parLevel: {
        type: Number,      // Minimum bottles before reorder alert
        default: 1
    },
    unitsPerCase: {
        type: Number,      // Standard case size (default 12)
        default: 12
    },
    vendorName: {
        type: String,      // Supplier / distributor name
        default: ''
    },
    // WatermelonDB Sync fields
    wmId: {
        type: String,
        required: true,
        unique: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    lastModifiedAt: {
        type: Number,
        default: () => Date.now()
    }
}, { timestamps: true });


module.exports = mongoose.model('Product', productSchema);
