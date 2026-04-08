const mongoose = require('mongoose');

const inventoryLogSchema = new mongoose.Schema({
    barId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bar',
        required: true
    },
    bottleBarcode: {
        type: String,
        required: true
    },
    measuredWeightGrams: {
        type: Number,
        required: true
    },
    calculatedVolumeMl: {
        type: Number,
        required: true
    },
    userId: {
        type: String // Optional: UUID of the bartender recording it
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

module.exports = mongoose.model('InventoryLog', inventoryLogSchema);
