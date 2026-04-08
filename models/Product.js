const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
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
        enum: ['spirits', 'wine', 'beer', 'mixer', 'other'],
        default: 'spirits'
    },
    fullWeightGrams: {
        type: Number,
        required: true
    },
    emptyWeightGrams: {
        type: Number, // Tare weight
        required: true
    },
    specificGravity: {
        type: Number, // Density of the liquid
        default: 1.0
    },
    fullVolumeMl: {
        type: Number,
        required: true
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
