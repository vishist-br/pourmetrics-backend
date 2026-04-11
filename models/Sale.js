const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null      // backfilled by migration script
    },
    barId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bar',
        default: null
    },
    bottleBarcode: {
        type: String,
        required: true
    },
    productName: {
        type: String,
        default: 'Unknown Product'
    },
    volumeSoldMl: {
        type: Number,
        required: true
    },
    saleAmountCurrency: {
        type: Number,
        default: 0         // ₹ or $ value of the sale
    },
    servingsCount: {
        type: Number,
        default: 1         // number of drinks poured
    },
    pourSizeMl: {
        type: Number,
        default: 0         // standard pour used (e.g. 30mL shot, 60mL peg)
    },
    userId: {
        type: String       // staff member who rang the sale
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Sale', saleSchema);
