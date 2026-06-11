const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-do-not-use-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Demo-only password check: stored hash is '$demo$<password>'
  // In production, use bcrypt.compare() or equivalent
  const expectedHash = `$demo$${password}`;
  if (user.password_hash !== expectedHash) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role, department: user.department },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
    },
  });
});

module.exports = router;
