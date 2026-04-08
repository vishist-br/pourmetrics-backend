const mongoose = require('mongoose');

const barSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String
    },
    settings: {
        currency: { type: String, default: 'USD' },
        measurementUnit: { type: String, default: 'ml' }
    }
}, { timestamps: true });

module.exports = mongoose.model('Bar', barSchema);
