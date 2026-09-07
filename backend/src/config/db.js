require('dotenv').config();
const { Pool } = require('pg');

// Parse DATABASE_URL or use defaults
const url = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/agriconnect';

// Parse the connection string to handle various formats
let config;
if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
  const parsed = new URL(url);
  config = {
    host: parsed.hostname === 'localhost' ? '127.0.0.1' : parsed.hostname,
    port: parseInt(parsed.port, 10),
    database: parsed.pathname.replace('/', ''),
    user: parsed.username,
    password: parsed.password,
  };
  // Cloud Postgres (Render/Neon/Supabase) requires SSL. Honor it when requested.
  if (parsed.searchParams.get('sslmode') === 'require') {
    config.ssl = { rejectUnauthorized: false };
  }
} else {
  config = { connectionString: url };
}

// Use explicit host to avoid IPv6 issues
config.host = config.host || '127.0.0.1';

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
