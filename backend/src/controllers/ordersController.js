const pool = require('../config/db');

// Long timeout for AI service calls. Render's free tier spins the service down
// after ~15 min of inactivity; a cold start can take 50s+ before OSRM runs. A
// short timeout aborts every route call after a sleep (showing "route
// optimization in progress" forever / "could not calculate route"). This must
// comfortably cover cold start + OSRM latency.
const AI_SERVICE_TIMEOUT_MS = 90000;

// Helper: Call AI service for route optimization
async function optimizeRoute(orderData) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

  if (!AI_SERVICE_URL) {
    console.warn('AI_SERVICE_URL not set, skipping route optimization');
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_SERVICE_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(`${AI_SERVICE_URL}/optimize-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      console.error(`AI service returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to call AI service for route optimization:', err.message);
    return null;
  }
}

// Helper: Call AI service for demand prediction
async function predictDemand(farmerId) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

  if (!AI_SERVICE_URL) {
    console.warn('AI_SERVICE_URL not set, skipping demand prediction');
    return null;
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/predict-demand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ farmerId }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.error(`AI service returned ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to call AI service for demand prediction:', err.message);
    return null;
  }
}

// Helper: Call AI service for price forecasting (consumer-facing, trend + season)
async function predictPrices(crops) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL;

  if (!AI_SERVICE_URL) {
    console.warn('AI_SERVICE_URL not set, skipping price forecast');
    return null;
  }

  try {
    const response = await fetch(`${AI_SERVICE_URL}/price-forecast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crops: crops || null }),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      console.error(`AI service returned ${response.status} for price-forecast`);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Failed to call AI service for price forecast:', err.message);
    return null;
  }
}

// GET /api/orders
// Returns orders relevant to the authenticated user:
// - Buyers see orders they placed
// - Farmers/FPOs see orders on their listings
async function getOrders(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query;
    let params = [req.user.id];
    let paramCount = 1;

    if (req.user.role === 'farmer' || req.user.role === 'fpo') {
      // Farmer: show orders on their listings
      query = `
        SELECT o.*, l.crop, l.unit, l.farmer_id,
               u.name as buyer_name, u.email as buyer_email, u.phone as buyer_phone,
               u.location as buyer_location
        FROM orders o
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON o.buyer_id = u.id
        WHERE l.farmer_id = $1
      `;
    } else {
      // Consumer/bulk_buyer: show orders they placed
      query = `
        SELECT o.*, l.crop, l.unit, l.farmer_id,
               u.name as seller_name, u.email as seller_email, u.phone as seller_phone
        FROM orders o
        JOIN listings l ON o.listing_id = l.id
        JOIN users u ON l.farmer_id = u.id
        WHERE o.buyer_id = $1
      `;
    }

    if (status) {
      paramCount++;
      query += ` AND o.status = $${paramCount}`;
      params.push(status);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.status(200).json({ orders: result.rows });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders
// Auth: consumer or bulk_buyer only
async function createOrder(req, res, next) {
  try {
    const {
      listing_id, quantity, price_per_unit, crop, unit,
      payment_method, payment_status, delivery_address,
      delivery_lat, delivery_lng
    } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'quantity must be positive' });
    }

    // Delivery address: prefer the order-level one given by the buyer;
    // fall back to the buyer's saved profile delivery_address, else their location.
    let resolvedAddress = delivery_address;
    if (!resolvedAddress) {
      const buyerRow = await pool.query(
        'SELECT delivery_address, location FROM users WHERE id = $1',
        [req.user.id]
      );
      const buyer = buyerRow.rows[0];
      resolvedAddress = buyer?.delivery_address || buyer?.location || null;
    }

    let actualListingId = listing_id;
    let total_price;

    if (listing_id) {
      // PRD path: a real listing ID was provided — validate it strictly
      const listing = await pool.query('SELECT * FROM listings WHERE id = $1', [listing_id]);

      if (listing.rowCount > 0) {
        const l = listing.rows[0];
        if (l.status !== 'active') {
          return res.status(400).json({ error: 'Listing is not active' });
        }
        if (l.quantity < quantity) {
          return res.status(400).json({
            error: 'Insufficient quantity available',
            available: l.quantity
          });
        }
        total_price = l.price_per_unit * quantity;
        actualListingId = l.id;
      } else if (price_per_unit && crop) {
        // Demo/resilience path: frontend sent a numeric demo id + product info.
        // Create a placeholder listing so the order can complete.
        total_price = price_per_unit * quantity;
      } else {
        return res.status(404).json({ error: 'Listing not found' });
      }
    } else if (price_per_unit && crop) {
      // No listing id, but product info present — tolerate demo orders
      total_price = price_per_unit * quantity;
    } else {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['listing_id', 'quantity']
      });
    }

    // If we don't yet have a real listing (placeholder path), create/save one now
    if (!actualListingId) {
      const placeholderPrice = price_per_unit || 50;
      const placeholderCrop = crop || 'Mixed Produce';
      const placeholderUnit = unit || 'kg';

      const farmerResult = await pool.query(
        "SELECT id FROM users WHERE role IN ('farmer','fpo') ORDER BY created_at LIMIT 1"
      );
      const farmerId = farmerResult.rowCount > 0 ? farmerResult.rows[0].id : null;

      if (farmerId) {
        const newListing = await pool.query(
          `INSERT INTO listings (farmer_id, crop, quantity, unit, price_per_unit, status, location)
           VALUES ($1, $2, 99999, $3, $4, 'active', 'AgriConnect Mandi')
           RETURNING *`,
          [farmerId, placeholderCrop, placeholderUnit, placeholderPrice]
        );
        actualListingId = newListing.rows[0].id;
      }
      total_price = placeholderPrice * quantity;
    }

    // Validate / apply payment status (paid only makes sense for online payments, not COD)
    const method = ['upi', 'card', 'netbanking', 'wallet', 'cod'].includes(payment_method)
      ? payment_method
      : 'cod';
    let payStatus = payment_status && ['pending', 'paid', 'failed'].includes(payment_status)
      ? payment_status
      : 'pending';
    if (method !== 'cod' && !payment_status) {
      // Online payment is captured upfront in this demo → mark paid immediately
      payStatus = 'paid';
    }

    // Normalize the buyer's map-pinned delivery coordinates (valid numbers only)
    const parsedLat = delivery_lat !== undefined && delivery_lat !== null && !Number.isNaN(parseFloat(delivery_lat))
      ? parseFloat(delivery_lat) : null;
    const parsedLng = delivery_lng !== undefined && delivery_lng !== null && !Number.isNaN(parseFloat(delivery_lng))
      ? parseFloat(delivery_lng) : null;

    // Create order with 'pending' status
    const orderResult = await pool.query(
      `INSERT INTO orders (buyer_id, listing_id, quantity, total_price, status, payment_method, payment_status, delivery_address, delivery_lat, delivery_lng)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.id, actualListingId, quantity, total_price, 'pending', method, payStatus, resolvedAddress, parsedLat, parsedLng]
    );

    const order = orderResult.rows[0];

    // Decrement the listing's available quantity (stock is reserved at order placement)
    if (actualListingId) {
      await pool.query(
        `UPDATE listings
         SET quantity = quantity - $1,
             status = CASE WHEN quantity - $1 <= 0 THEN 'sold_out' ELSE status END
         WHERE id = $2`,
        [quantity, actualListingId]
      );
    }

    res.status(201).json({ order });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/:orderId
async function getOrderById(req, res, next) {
  try {
    const { orderId } = req.params;

    const result = await pool.query(
      `SELECT o.*, l.crop, l.unit, l.location as listing_location, l.farmer_id,
              buyer.name as buyer_name, buyer.email as buyer_email, buyer.phone as buyer_phone,
              seller.name as seller_name, seller.email as seller_email, seller.phone as seller_phone
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users buyer ON o.buyer_id = buyer.id
       JOIN users seller ON l.farmer_id = seller.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = result.rows[0];

    // Verify user has access to this order
    if (order.buyer_id !== req.user.id && order.farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this order' });
    }

    res.status(200).json({ order });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/:orderId
async function updateOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { quantity } = req.body;

    // Verify order exists
    const existing = await pool.query(
      `SELECT o.*, l.farmer_id, l.price_per_unit, l.quantity as listing_quantity
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = existing.rows[0];

    // Only buyer can update order, and only if pending
    if (order.buyer_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'Only the buyer can update this order' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ error: 'Can only update pending orders' });
    }

    if (quantity !== undefined) {
      if (quantity <= 0) {
        return res.status(400).json({ error: 'quantity must be positive' });
      }

      const quantityDiff = quantity - order.quantity;

      // Check if enough quantity available
      if (quantityDiff > order.listing_quantity) {
        return res.status(400).json({
          error: 'Insufficient quantity available',
          available: order.listing_quantity + order.quantity
        });
      }

      const newTotalPrice = order.price_per_unit * quantity;

      // Update order
      const result = await pool.query(
        `UPDATE orders SET quantity = $1, total_price = $2 WHERE id = $3 RETURNING *`,
        [quantity, newTotalPrice, orderId]
      );

      // Update listing quantity
      await pool.query(
        'UPDATE listings SET quantity = quantity - $1 WHERE id = $2',
        [quantityDiff, order.listing_id]
      );

      return res.status(200).json({ order: result.rows[0] });
    }

    return res.status(400).json({ error: 'No fields to update' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/orders/:orderId/status
async function updateOrderStatus(req, res, next) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        valid: validStatuses
      });
    }

    // Verify order exists
    const existing = await pool.query(
      `SELECT o.*, l.farmer_id, l.location as pickup_location,
              buyer.location as delivery_location
       FROM orders o
       JOIN listings l ON o.listing_id = l.id
       JOIN users buyer ON o.buyer_id = buyer.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = existing.rows[0];

    // Authorization: seller can confirm/ship/deliver, buyer can cancel
    const isSeller = order.farmer_id === req.user.id;
    const isBuyer = order.buyer_id === req.user.id;

    if (!isSeller && !isBuyer) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have access to this order' });
    }

    // Validate status transitions
    const currentStatus = order.status;
    const validTransitions = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['delivered', 'cancelled'],
      delivered: [],
      cancelled: []
    };

    if (!validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        error: 'Invalid status transition',
        current: currentStatus,
        allowed: validTransitions[currentStatus]
      });
    }

    // Only seller can confirm/ship/deliver
    if (['confirmed', 'shipped', 'delivered'].includes(status) && !isSeller) {
      return res.status(403).json({ error: 'Only the seller can transition to this status' });
    }

    // AI integration: optimize route when order is confirmed.
    // Pickup = the listing's location string (the farmer's area). Delivery =
    // the buyer's map-pinned coordinates stored on the order; fall back to the
    // delivery address string for orders placed before the map feature.
    let route = null;
    if (status === 'confirmed' && !order.route) {
      const deliveryCoords =
        order.delivery_lat != null && order.delivery_lng != null
          ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
          : (order.delivery_address || undefined);
      route = await optimizeRoute({
        orderId: order.id,
        pickup: order.pickup_location,
        delivery: deliveryCoords,
        quantity: order.quantity
      });
    }

    // Update order status
    const updateQuery = route
      ? 'UPDATE orders SET status = $1, route = $2 WHERE id = $3 RETURNING *'
      : 'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *';

    const updateParams = route
      ? [status, JSON.stringify(route), orderId]
      : [status, orderId];

    const result = await pool.query(updateQuery, updateParams);

    // Restore stock if the order is cancelled (so cancelled orders don't permanently reserve stock)
    if (status === 'cancelled') {
      await pool.query(
        'UPDATE listings SET quantity = quantity + $1 WHERE id = $2',
        [order.quantity, order.listing_id]
      );
    }

    res.status(200).json({ order: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/orders/preview-route
// Live route preview for the buy modal. Given the seller's pickup area (listing
// location) and a buyer-pinned delivery coordinate, calls the AI service for a
// real road-optimized route (distance/ETA/cost + polyline) and returns it.
// Keeps AI_SERVICE_URL private to the backend.
async function previewRoute(req, res, next) {
  try {
    const { pickup_location, delivery_lat, delivery_lng, quantity } = req.body;
    const lat = parseFloat(delivery_lat);
    const lng = parseFloat(delivery_lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'delivery_lat and delivery_lng are required' });
    }

    const route = await optimizeRoute({
      pickup: pickup_location || 'AgriConnect Mandi',
      delivery: { lat, lng },
      quantity: parseFloat(quantity) || 1
    });

    if (!route) {
      return res.status(503).json({ error: 'Route optimization service unavailable' });
    }

    res.status(200).json(route);
  } catch (err) {
    next(err);
  }
}

// In-memory geocode cache keyed by the normalized address string. The frontend
// debounces a geocode on every keystroke while typing, and Nominatim (free,
// no key) rate-limits aggressively from shared server IPs. Caching a resolved
// or failed address avoids hammering the geocoder for the same query, which is
// the main cause of the "could not find this address" errors.
const geoCache = new Map();
const GEO_CACHE_MAX = 500;

// POST /api/orders/geocode
// Resolves a typed delivery address string to map coordinates so the frontend
// can pin it on the map and keep the address field and map in sync. Uses the
// OpenStreetMap Nominatim geocoder (free, no key). Served server-side to avoid
// CORS/rate-limit issues from the browser.
async function geocodeAddress(req, res, next) {
  try {
    const { address } = req.body;
    if (!address || !address.trim()) {
      return res.status(400).json({ error: 'address is required' });
    }

    const key = address.trim().toLowerCase();

    // Serve a cached answer (success or explicit no-result) so repeat queries
    // for the same address never touch Nominatim again.
    if (geoCache.has(key)) {
      return res.status(geoCache.get(key).status).json(geoCache.get(key).body);
    }

    const q = encodeURIComponent(address.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`;

    // Nominatim returns 429 (and sometimes 5xx) when we exceed its per-IP rate
    // limit. Retry a couple of times with a short backoff before failing, since
    // a single transient rejection shouldn't surface as "address not found".
    let resp = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        resp = await fetch(url, {
          headers: {
            'User-Agent': 'AgriConnect/1.0 (order delivery geocoder; https://agriconnect.in)',
            'Accept-Language': 'en'
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timer);
      }
      if (resp.ok || (resp.status !== 429 && resp.status < 500)) {
        break; // success or a definitive non-rate-limit failure
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }

    if (!resp || !resp.ok) {
      if (resp && resp.status >= 500) {
        return res.status(502).json({ error: 'Geocoding service unavailable' });
      }
      return res.status(429).json({ error: 'Geocoding service busy, try again' });
    }

    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) {
      geoCache.set(key, { status: 404, body: { error: 'Address not found on map' } });
      if (geoCache.size > GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value);
      return res.status(404).json({ error: 'Address not found on map' });
    }

    const r = results[0];
    const body = {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      display_name: r.display_name || null
    };
    geoCache.set(key, { status: 200, body });
    if (geoCache.size > GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value);
    res.status(200).json(body);
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/dashboard/demand-forecast
// Farmer-only: returns AI-predicted demand for their listings
async function getDemandForecast(req, res, next) {
  try {
    if (req.user.role !== 'farmer' && req.user.role !== 'fpo') {
      return res.status(403).json({ error: 'Only farmers/FPOs can access demand forecasts' });
    }

    const forecast = await predictDemand(req.user.id);

    if (!forecast) {
      return res.status(200).json({
        message: 'Demand forecasting service unavailable',
        forecast: null
      });
    }

    res.status(200).json({ forecast });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/price-forecast
// Consumer-facing: returns predicted price + trend + season for each crop over
// the next 7 days, derived by the AI service from recent price changes and the
// seasonal price cycle.
async function getPriceForecast(req, res, next) {
  try {
    // Optional ?crops=Wheat,Onions filter; otherwise all known crops.
    const crops = req.query.crops
      ? String(req.query.crops).split(',').map((c) => c.trim()).filter(Boolean)
      : null;

    const result = await predictPrices(crops);

    if (!result) {
      return res.status(503).json({
        message: 'Price forecasting service unavailable',
        forecast: null
      });
    }

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrders,
  createOrder,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  previewRoute,
  geocodeAddress,
  getDemandForecast,
  getPriceForecast
};
