// Authorization middleware for role-based and ownership-based access control

/**
 * Restricts access to specified roles.
 * Must be used AFTER requireAuth (expects req.user to exist).
 *
 * @param {...string} allowedRoles - One or more roles that can access this route
 * @returns Express middleware
 *
 * @example
 * router.post('/listings', requireAuth, requireRole('farmer', 'fpo'), createListing);
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

/**
 * Verifies the authenticated user owns the resource.
 * Must be used AFTER requireAuth.
 *
 * @param {Function} getOwnerId - Async function that returns the owner's user ID
 * @returns Express middleware
 *
 * @example
 * router.patch('/listings/:id', requireAuth, requireOwnership(async (req) => {
 *   const result = await pool.query('SELECT farmer_id FROM listings WHERE id = $1', [req.params.id]);
 *   return result.rows[0]?.farmer_id;
 * }), updateListing);
 */
function requireOwnership(getOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const ownerId = await getOwnerId(req);

      if (!ownerId) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      if (ownerId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden', message: 'You do not own this resource' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireRole, requireOwnership };
