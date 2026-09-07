const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

// POST /api/users/register
async function register(req, res, next) {
  try {
    const { name, email, password, role, phone, location } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'name, email, password, and role are required' });
    }

    const validRoles = ['farmer', 'fpo', 'consumer', 'bulk_buyer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        valid: validRoles
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 characters' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, phone, location)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, phone, location, created_at`,
      [name, normalizedEmail, passwordHash, role, phone, location]
    );

    const user = result.rows[0];
    const token = signToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
}

// POST /api/users/login
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [normalizedEmail]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'No account found with this email' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials', message: 'Incorrect password' });
    }

    const token = signToken(user);
    delete user.password_hash;

    res.status(200).json({ user, token });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/me (requires requireAuth middleware)
async function me(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, phone, location, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { register, login, me };
