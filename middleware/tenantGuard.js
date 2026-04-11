const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'pourmetrics_secret_123';

/**
 * tenantGuard — verifies JWT and attaches userId, userRole, orgId to req.
 */
function tenantGuard(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        req.userRole = decoded.role;
        req.orgId = decoded.orgId || null;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Role guard helpers — compose on top of tenantGuard
function superadminOnly(req, res, next) {
    if (req.userRole === 'superadmin') return next();
    return res.status(403).json({ error: 'Superadmin access required' });
}

function ownerOrAbove(req, res, next) {
    if (['superadmin', 'owner'].includes(req.userRole)) return next();
    return res.status(403).json({ error: 'Owner access required' });
}

function managerOrAbove(req, res, next) {
    if (['superadmin', 'owner', 'manager'].includes(req.userRole)) return next();
    return res.status(403).json({ error: 'Manager access required' });
}

module.exports = tenantGuard;
module.exports.superadminOnly = superadminOnly;
module.exports.ownerOrAbove = ownerOrAbove;
module.exports.managerOrAbove = managerOrAbove;
