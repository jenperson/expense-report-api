process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Initialize the database before importing the app
const { initDb, getDb } = require('../src/db/database');
initDb();

const app = require('../src/index');

function makeToken(overrides = {}) {
  return jwt.sign(
    { id: 1, email: 'alice@example.com', name: 'Alice Chen', role: 'employee', department: 'Engineering', ...overrides },
    'test-secret',
    { expiresIn: '1h' }
  );
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('POST /api/expenses', () => {
  const validExpense = {
    amount: 75.00,
    category: 'travel',
    description: 'Train to client meeting',
    date: '2026-06-09',
  };

  test('creates an expense with valid data', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(makeToken()))
      .send(validExpense);

    expect(res.status).toBe(201);
    expect(res.body.amount).toBe(75.00);
    expect(res.body.status).toBe('pending');
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).post('/api/expenses').send(validExpense);
    expect(res.status).toBe(401);
  });

  test('returns 400 when amount is missing', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(makeToken()))
      .send({ ...validExpense, amount: undefined });

    expect(res.status).toBe(400);
  });

  test('returns 400 when category is invalid', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(makeToken()))
      .send({ ...validExpense, category: 'snacks' });

    expect(res.status).toBe(400);
  });

  // This test documents the negative amount bug.
  // It currently FAILS because the validation does not reject negative amounts.
  // After fixing validation.js (adding .positive()), this test should pass.
  test('returns 400 when amount is negative', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(makeToken()))
      .send({ ...validExpense, amount: -150 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  test('returns 400 when amount is zero', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .set(authHeader(makeToken()))
      .send({ ...validExpense, amount: 0 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses', () => {
  test('returns expenses for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/expenses')
      .set(authHeader(makeToken()));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.expenses)).toBe(true);
  });

  test('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/expenses');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/expenses/:id', () => {
  test('returns 404 for a non-existent expense', async () => {
    const res = await request(app)
      .get('/api/expenses/99999')
      .set(authHeader(makeToken()));

    expect(res.status).toBe(404);
  });
});
