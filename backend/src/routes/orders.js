const express = require('express');
const router = express.Router();
const {
  getOrders,
  createOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  previewRoute,
  geocodeAddress,
  getDemandForecast,
  getMarketDemand,
  getPriceForecast
} = require('../controllers/ordersController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// GET /api/orders - authenticated users see their relevant orders
router.get('/', requireAuth, getOrders);

// POST /api/orders - consumer/bulk_buyer only
router.post('/', requireAuth, requireRole('consumer', 'bulk_buyer'), createOrder);

// POST /api/orders/preview-route - live map route preview for the buy modal
router.post('/preview-route', requireAuth, previewRoute);

// POST /api/orders/geocode - resolve typed address to map coordinates
router.post('/geocode', requireAuth, geocodeAddress);

// GET /api/orders/dashboard/demand-forecast - farmer/fpo only
router.get('/dashboard/demand-forecast', requireAuth, getDemandForecast);

// GET /api/orders/demand-forecast - any authenticated user (consumer mandi market)
router.get('/demand-forecast', requireAuth, getMarketDemand);

// GET /api/orders/price-forecast - consumer-facing price trend prediction
router.get('/price-forecast', requireAuth, getPriceForecast);

// GET /api/orders/:orderId - view single order
router.get('/:orderId', requireAuth, getOrderById);

// PATCH /api/orders/:orderId - update order (buyer only, pending only)
router.patch('/:orderId', requireAuth, updateOrder);

// PATCH /api/orders/:orderId/status - update order status
router.patch('/:orderId/status', requireAuth, updateOrderStatus);

module.exports = router;
