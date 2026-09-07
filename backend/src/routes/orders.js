const express = require('express');
const router = express.Router();
const {
  getOrders,
  createOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  getDemandForecast
} = require('../controllers/ordersController');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/authorize');

// GET /api/orders - authenticated users see their relevant orders
router.get('/', requireAuth, getOrders);

// POST /api/orders - consumer/bulk_buyer only
router.post('/', requireAuth, requireRole('consumer', 'bulk_buyer'), createOrder);

// GET /api/orders/dashboard/demand-forecast - farmer/fpo only
router.get('/dashboard/demand-forecast', requireAuth, getDemandForecast);

// GET /api/orders/:orderId - view single order
router.get('/:orderId', requireAuth, getOrderById);

// PATCH /api/orders/:orderId - update order (buyer only, pending only)
router.patch('/:orderId', requireAuth, updateOrder);

// PATCH /api/orders/:orderId/status - update order status
router.patch('/:orderId/status', requireAuth, updateOrderStatus);

module.exports = router;
