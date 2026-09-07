const express = require('express');
const router = express.Router();
const {
  getListings,
  createListing,
  updateListing,
  getPriceHistory
} = require('../controllers/listingsController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// GET /api/listings - public, no auth required
router.get('/', getListings);

// GET /api/listings/:crop/price-history - public
router.get('/:crop/price-history', getPriceHistory);

// POST /api/listings - farmer/fpo only
router.post('/', requireAuth, requireRole('farmer', 'fpo'), createListing);

// PATCH /api/listings/:id - owner only (checked in controller)
router.patch('/:id', requireAuth, requireRole('farmer', 'fpo'), updateListing);

module.exports = router;
