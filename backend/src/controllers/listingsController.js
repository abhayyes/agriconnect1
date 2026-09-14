const pool = require('../config/db');

// In-memory geocode cache shared across listings so "nearest" sorting never
// hammers Nominatim for the same location string more than once.
const geoCache = new Map();
const GEO_CACHE_MAX = 500;

// Resolve a location string to coordinates via Nominatim (best-effort, cached).
// Returns { lat, lng } or null on any failure so listing creation/reads are
// never blocked by a geocode hiccup.
async function geocodeLocation(location) {
  if (!location || !location.trim()) return null;
  const key = location.trim().toLowerCase();
  if (geoCache.has(key)) return geoCache.get(key);

  try {
    const q = encodeURIComponent(location.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=in`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'AgriConnect/1.0 (listing geocoder; https://agriconnect.in)',
        'Accept-Language': 'en'
      },
      signal: AbortSignal.timeout(10000)
    });
    if (!resp.ok) return null;
    const results = await resp.json();
    if (!Array.isArray(results) || results.length === 0) return null;
    const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    if (geoCache.size > GEO_CACHE_MAX) geoCache.delete(geoCache.keys().next().value);
    geoCache.set(key, coords);
    return coords;
  } catch (err) {
    return null;
  }
}

// Haversine great-circle distance in kilometres between two lat/lng points.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// GET /api/listings
// Query params: crop, status, location, page, limit
async function getListings(req, res, next) {
  try {
    const { crop, status, location, page = 1, limit = 20, sort, lat, lng } = req.query;
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

    if (status === 'all') {
      // No status filter — return everything (used by farmer dashboard)
    } else if (status) {
      paramCount++;
      query += ` AND l.status = $${paramCount}`;
      params.push(status);
    } else {
      // Default: only show active listings
      paramCount++;
      query += ` AND l.status = $${paramCount}`;
      params.push('active');
    }

    if (location) {
      paramCount++;
      query += ` AND l.location ILIKE $${paramCount}`;
      params.push(`%${location}%`);
    }

    // Ordering: nearest (requires consumer lat/lng), price low->high, price
    // high->low, or newest (default).
    let orderBy = 'l.created_at DESC';
    if (sort === 'price_asc') orderBy = 'l.price_per_unit ASC NULLS LAST';
    else if (sort === 'price_desc') orderBy = 'l.price_per_unit DESC NULLS LAST';
    else if (sort === 'newest') orderBy = 'l.created_at DESC';

    query += ` ORDER BY ${orderBy} LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    let rows = result.rows;

    // Nearest sort: distance from the consumer's coordinates to each listing.
    // Listings that lack stored coordinates are lazily geocoded (cached) and
    // persisted, so the distance only needs to be computed once per location.
    if (sort === 'nearest' && lat != null && lng != null) {
      const originLat = parseFloat(lat);
      const originLng = parseFloat(lng);
      for (const r of rows) {
        let latV = r.lat;
        let lngV = r.lng;
        if (latV == null || lngV == null) {
          const c = await geocodeLocation(r.location);
          if (c) {
            latV = c.lat;
            lngV = c.lng;
            try {
              await pool.query('UPDATE listings SET lat = $1, lng = $2 WHERE id = $3', [latV, lngV, r.id]);
            } catch (err) { /* non-fatal */ }
          }
        }
        r.distance_km = (latV != null && lngV != null)
          ? Math.round(haversineKm(originLat, originLng, latV, lngV) * 10) / 10
          : null;
      }
      rows = rows.slice().sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM listings WHERE 1=1';
    const countParams = [];
    let countParamIndex = 0;

    if (crop) {
      countParamIndex++;
      countQuery += ` AND crop ILIKE $${countParamIndex}`;
      countParams.push(`%${crop}%`);
    }
    if (status === 'all') {
      // No status filter
    } else if (status) {
      countParamIndex++;
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push(status);
    } else {
      countParamIndex++;
      countQuery += ` AND status = $${countParamIndex}`;
      countParams.push('active');
    }
    if (location) {
      countParamIndex++;
      countQuery += ` AND location ILIKE $${countParamIndex}`;
      countParams.push(`%${location}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.status(200).json({
      listings: rows,
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
    const { crop, variety, quantity, unit, price_per_unit, location, status, lat, lng } = req.body;

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

    // Best-effort: store coordinates for the listing's location so consumers
    // can see and sort by distance, and so route tracking uses the exact farm
    // origin. Prefer the farmer's map-pinned coordinates from the body; fall
    // back to geocoding the location string. Never blocks a successful create.
    const listing = result.rows[0];
    if (location || (lat != null && lng != null)) {
      const provided =
        lat != null && lng != null && isFinite(Number(lat)) && isFinite(Number(lng));
      const coords = provided
        ? { lat: Number(lat), lng: Number(lng) }
        : await geocodeLocation(location);
      if (coords && isFinite(coords.lat) && isFinite(coords.lng)) {
        try {
          await pool.query('UPDATE listings SET lat = $1, lng = $2 WHERE id = $3', [coords.lat, coords.lng, listing.id]);
          listing.lat = coords.lat;
          listing.lng = coords.lng;
        } catch (err) { /* non-fatal */ }
      }
    }

    res.status(201).json({ listing });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/listings/:id
// Auth: must be owner (farmer_id matches req.user.id)
async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const { crop, variety, quantity, unit, price_per_unit, status, location, lat, lng } = req.body;

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
    const listing = result.rows[0];

    // Best-effort: refresh the stored coords so "nearest listing" sorting and
    // the route origin stay accurate. Prefer the map-pinned lat/lng sent from
    // the Adjust modal; fall back to geocoding a changed location string.
    const provided = lat != null && lng != null && isFinite(Number(lat)) && isFinite(Number(lng));
    if (provided) {
      try {
        await pool.query('UPDATE listings SET lat = $1, lng = $2 WHERE id = $3', [Number(lat), Number(lng), id]);
        listing.lat = Number(lat);
        listing.lng = Number(lng);
      } catch (err) { /* non-fatal */ }
    } else if (location !== undefined && location) {
      const coords = await geocodeLocation(location);
      if (coords) {
        try {
          await pool.query('UPDATE listings SET lat = $1, lng = $2 WHERE id = $3', [coords.lat, coords.lng, id]);
          listing.lat = coords.lat;
          listing.lng = coords.lng;
        } catch (err) { /* non-fatal */ }
      }
    }

    res.status(200).json({ listing });
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
