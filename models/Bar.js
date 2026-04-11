const mongoose = require('mongoose');

const barSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    orgId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: false,
        default: null
    },
    settings: {
        currency: { type: String, default: 'INR' },
        measurementUnit: { type: String, default: 'ml' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Bar', barSchema);
