require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pool = require('./config/db');
const healthRoutes = require('./routes/health');
const userRoutes = require('./routes/users');
const listingRoutes = require('./routes/listings');
const orderRoutes = require('./routes/orders');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/', healthRoutes);
app.use('/api/users', userRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/orders', orderRoutes);

// Self-heal schema at boot: idempotently ensure the listing geocode columns so
// the "nearest listing" sort works without a manual migration against the prod
// DB. Non-fatal — if the DB is unreachable at startup we simply skip and try
// again next boot (and migrate.js still applies the full migration manually).
(async () => {
  try {
    await pool.query(
      'ALTER TABLE listings ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION'
    );
    await pool.query(
      'ALTER TABLE listings ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION'
    );
    console.log('Schema self-heal: listings.lat/lng ensured');
  } catch (err) {
    console.warn('Schema self-heal skipped (DB unavailable?):', err.message);
  }
})();

// Keep the AI service warm so a consumer's first route preview doesn't sit
// behind a long cold start. Render free tier sleeps a service after ~15 min of
// inactivity; ping /health on a shorter cadence whenever the backend is up.
// Best-effort and non-blocking - if the AI URL is unset or unreachable we skip.
const AI_SERVICE_URL = process.env.AI_SERVICE_URL;
if (AI_SERVICE_URL) {
  const ping = () => {
    fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) })
      .then((r) => { if (r.ok) console.log('[keep-alive] AI service warm'); })
      .catch(() => { /* AI temporarily unreachable; will retry next tick */ });
  };
  ping(); // immediate so any pre-warm happens before the first consumer
  setInterval(ping, 7 * 60 * 1000); // every 7 min, inside the 15-min idle cap
}

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`AgriConnect backend listening on port ${PORT}`);
});

module.exports = app;
