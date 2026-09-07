/**
 * AgriConnect Database Seeder
 * Seeds sample users, listings, and price history for a working demo.
 *
 * Usage: node src/db/seed.js
 */
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const PASSWORD = 'password123';

const DEMO_USERS = [
  {
    name: 'Demo Farmer',
    email: 'farmer@demo.com',
    role: 'farmer',
    phone: '9876500001',
    location: 'Ludhiana, Punjab'
  },
  {
    name: 'Demo Buyer',
    email: 'buyer@demo.com',
    role: 'consumer',
    phone: '9876500002',
    location: 'Delhi, India'
  },
  {
    name: 'Malwa Agri FPO',
    email: 'fpo@demo.com',
    role: 'fpo',
    phone: '9876500003',
    location: 'Karnal, Haryana'
  },
  {
    name: 'GreenMart Retail',
    email: 'bulk@demo.com',
    role: 'bulk_buyer',
    phone: '9876500004',
    location: 'Mumbai, Maharashtra'
  }
];

const DEMO_LISTINGS = [
  { crop: 'Organic Vine Tomatoes', variety: 'Hybrid', price_per_unit: 35, unit: 'kg', quantity: 500, location: 'Ludhiana, Punjab' },
  { crop: 'Golden Sharbati Wheat', variety: 'Sharbati', price_per_unit: 28, unit: 'kg', quantity: 1200, location: 'Karnal, Haryana' },
  { crop: 'Aromatic Basmati Rice', variety: 'Pusa 1121', price_per_unit: 85, unit: 'kg', quantity: 850, location: 'Bareilly, UP' },
  { crop: 'Nashik Red Onions', variety: 'Nasik Red', price_per_unit: 24, unit: 'kg', quantity: 2000, location: 'Nashik, Maharashtra' },
  { crop: 'Himachal Royal Gala Apples', variety: 'Royal Gala', price_per_unit: 130, unit: 'kg', quantity: 400, location: 'Shimla, HP' },
  { crop: 'Kashmiri Walnuts', variety: 'In Shell', price_per_unit: 340, unit: 'kg', quantity: 150, location: 'Anantnag, J&K' },
  { crop: 'Fresh Green Peas', variety: 'Arkel', price_per_unit: 60, unit: 'kg', quantity: 300, location: 'Karnal, Haryana' }
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting AgriConnect seed...');
    await client.query('BEGIN');

    // 1. Clear existing data (for clean re-runs)
    await client.query('TRUNCATE orders, price_history, listings, users RESTART IDENTITY CASCADE');

    // 2. Create users and capture their IDs
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const userIds = {};
    for (const u of DEMO_USERS) {
      const res = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone, location)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [u.name, u.email, passwordHash, u.role, u.phone, u.location]
      );
      userIds[u.role] = userIds[u.role] || res.rows[0].id;
      console.log(`  ✓ User created: ${u.name} (${u.role})`);
    }

    // 3. Create listings (assigned to farmers/fpos)
    const listingIds = [];
    for (let i = 0; i < DEMO_LISTINGS.length; i++) {
      const l = DEMO_LISTINGS[i];
      // Alternate between farmer and fpo owners
      const ownerRole = i % 2 === 0 ? 'farmer' : 'fpo';
      const farmerId = userIds[ownerRole];
      const res = await client.query(
        `INSERT INTO listings (farmer_id, crop, variety, quantity, unit, price_per_unit, status, location)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
         RETURNING id`,
        [farmerId, l.crop, l.variety, l.quantity, l.unit, l.price_per_unit, l.location]
      );
      listingIds.push(res.rows[0].id);

      // Record initial price point (offset into the past for a realistic chart)
      const daysAgo = 30 - i * 5;
      await client.query(
        `INSERT INTO price_history (crop, listing_id, price, unit, recorded_at)
         VALUES ($1, $2, $3, $4, NOW() - ($5::int || ' days')::INTERVAL)`,
        [l.crop, res.rows[0].id, l.price_per_unit, l.unit, daysAgo]
      );
      console.log(`  ✓ Listing created: ${l.crop} @ ₹${l.price_per_unit}/${l.unit}`);
    }

    await client.query('COMMIT');

    console.log('\n✅ Seed complete!');
    console.log('Demo login credentials (password for all): ' + PASSWORD);
    console.log('  Farmer : farmer@demo.com');
    console.log('  Buyer  : buyer@demo.com');
    console.log('  FPO    : fpo@demo.com');
    console.log('  Bulk   : bulk@demo.com');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
