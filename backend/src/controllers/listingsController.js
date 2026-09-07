const pool = require('../config/db');

// GET /api/listings
// Query params: crop, status, location, page, limit
async function getListings(req, res, next) {
  try {
    const { crop, status, location, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT l.*, u.name as farmer_name, u.phone as farmer_phone
      FROM listings l
      JOIN users u ON l.farmer_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (crop) {
      paramCount++;
      query += ` AND l.crop ILIKE $${paramCount}`;
      params.push(`%${crop}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
    }

    if (location) {
      paramCount++;
      query += ` AND l.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }

    query += ` ORDER BY l.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM listings WHERE 1=1';
    const countParams = [];
    let countParamIndex = 0;

    if (crop) {
      countParamIndex++;
      countQuery += ` AND crop ILIKE $${countParamIndex}`;
      countParams.push(`%${crop}%`);
    }
    if (status) {
      countParamIndex++;
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    }
    if (location) {
      countParamIndex++;
      countQuery += ` AND location ILIKE $${countParamIndex}`;
      countParams.push(`%${location}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      listings: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/listings
// Auth: farmer or fpo only
async function createListing(req, res, next) {
  try {
    const { crop, variety, quantity, unit, price_per_unit, location, status } = req.body;

    if (!crop || !quantity || !unit || !price_per_unit) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['crop', 'quantity', 'unit', 'price_per_unit']
      });
    }

    if (quantity <= 0 || price_per_unit <= 0) {
      return res.status(400).json({ error: 'quantity and price_per_unit must be positive' });
    }

    const result = await pool.query(
      `INSERT INTO listings (farmer_id, crop, variety, quantity, unit, price_per_unit, location, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.user.id,
        crop,
        variety || null,
        quantity,
        unit,
        price_per_unit,
        location || null,
        status || 'active'
      ]
    );

    // Record initial price in price_history
    await pool.query(
      `INSERT INTO price_history (crop, listing_id, price, unit)
       VALUES ($1, $2, $3, $4)`,
      [crop, result.rows[0].id, price_per_unit, unit]
    );

    res.status(201).json({ listing: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/listings/:id
// Auth: must be owner (farmer_id matches req.user.id)
async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const { crop, variety, quantity, unit, price_per_unit, status, location } = req.body;

    // First verify the listing exists and user owns it
    const existing = await pool.query(
      'SELECT * FROM listings WHERE id = $1',
      [id]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (existing.rows[0].farmer_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not own this listing' });
    }

    // Build dynamic update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    if (crop !== undefined) {
      paramCount++;
      updates.push(`crop = $${paramCount}`);
      params.push(crop);
    }
    if (variety !== undefined) {
      paramCount++;
      updates.push(`variety = $${paramCount}`);
      params.push(variety);
    }
    if (quantity !== undefined) {
      if (quantity < 0) {
        return res.status(400).json({ error: 'quantity must be non-negative' });
      }
      paramCount++;
      updates.push(`quantity = $${paramCount}`);
      params.push(quantity);
    }
    if (unit !== undefined) {
      paramCount++;
      updates.push(`unit = $${paramCount}`);
      params.push(unit);
    }
    if (price_per_unit !== undefined) {
      if (price_per_unit < 0) {
        return res.status(400).json({ error: 'price_per_unit must be non-negative' });
      }
      paramCount++;
      updates.push(`price_per_unit = $${paramCount}`);
      params.push(price_per_unit);

      // Record price change in history
      await pool.query(
        `INSERT INTO price_history (crop, listing_id, price, unit)
         VALUES ($1, $2, $3, $4)`,
        [
          crop || existing.rows[0].crop,
          id,
          price_per_unit,
          unit || existing.rows[0].unit
        ]
      );
    }
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }
    if (location !== undefined) {
      paramCount++;
      updates.push(`location = $${paramCount}`);
      params.push(location);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    params.push(id);

    const result = await pool.query(
      `UPDATE listings SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    res.status(200).json({ listing: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

// GET /api/listings/:crop/price-history
async function getPriceHistory(req, res, next) {
  try {
    const { crop } = req.params;
    const { days = 30, limit = 100 } = req.query;

    const result = await pool.query(
      `SELECT id, crop, price, unit, recorded_at
       FROM price_history
       WHERE crop ILIKE $1
         AND recorded_at >= NOW() - INTERVAL '1 day' * $2
       ORDER BY recorded_at DESC
       LIMIT $3`,
      [`%${crop}%`, days, limit]
    );

    res.status(200).json({
      crop,
      history: result.rows
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getListings,
  createListing,
  updateListing,
  getPriceHistory
};
