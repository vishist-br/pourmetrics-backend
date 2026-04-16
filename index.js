require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');

// Ensure Organization model is registered before any route uses it
require('./models/Organization');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Middlewares
app.use(helmet()); // Sets various security-related HTTP headers
app.use(express.json());

// 2. CORS Configuration (Tighten this for production)
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['*'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
            callback(null, true);
        } else {
            logger.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

// 3. Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window`
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Basic health check route
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'PourMetrics Backend is running', timestamp: new Date() });
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

// 4. Database Connection
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => logger.info('MongoDB connected successfully'))
        .catch(err => logger.error('MongoDB connection error:', { error: err.message }));
} else {
    logger.warn('MONGODB_URI not found in .env. Skipping database connection for now.');
}

const server = app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});

// 5. Graceful Shutdown
const shutdown = () => {
    logger.info('Stopping server gracefully...');
    server.close(() => {
        logger.info('Server closed. Closing database connection...');
        mongoose.connection.close(false).then(() => {
            logger.info('Database connection closed. Exiting process.');
            process.exit(0);
        });
    });

    // Force exit if shutdown takes too long
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
