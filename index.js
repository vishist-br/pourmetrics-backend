require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PourMetrics Backend is running' });
});

// Important API Routes
app.use('/api/products', require('./routes/product'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/analytics', require('./routes/analytics'));

// Avoid connecting to Mongo if URI is not provided (for POC scaffolding)
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => console.log('MongoDB connected successfully'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('MONGODB_URI not found in .env. Skipping database connection for now.');
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
