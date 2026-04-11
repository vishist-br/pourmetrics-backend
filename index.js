require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Ensure Organization model is registered before any route uses it
require('./models/Organization');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
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
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/superadmin/orgs', require('./routes/superadmin/orgs'));
app.use('/api/owner/staff', require('./routes/owner/staff'));
app.use('/api/bars', require('./routes/bars'));


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
