process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { initDb } = require('../src/db/database');
initDb();

const app = require('../src/index');

function makeToken(overrides = {}) {
  return jwt.sign(
    { id: 1, email: 'alice@example.com', name: 'Alice Chen', role: 'employee', department: 'Engineering', ...overrides },
    'test-secret',
    { expiresIn: '1h' }
  );
}

function makeManagerToken() {
  return makeToken({ id: 3, email: 'carol@example.com', name: 'Carol Kim', role: 'manager' });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('GET /api/reports/summary', () => {
  test('returns 400 when date params are missing', async () => {
    const res = await request(app)
      .get('/api/reports/summary')
      .set(authHeader(makeToken()));

    expect(res.status).toBe(400);
  });

  test('returns summary for a date range', async () => {
    const res = await request(app)
      .get('/api/reports/summary?start_date=2026-01-01&end_date=2026-12-31')
      .set(authHeader(makeToken()));

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('by_category');
    expect(res.body).toHaveProperty('grand_total');
  });

  test('returns 401 without auth', async () => {
    const res = await request(app)
      .get('/api/reports/summary?start_date=2026-01-01&end_date=2026-12-31');

    expect(res.status).toBe(401);
  });
});

describe('GET /api/reports/pending', () => {
  test('returns 403 for non-manager users', async () => {
    const res = await request(app)
      .get('/api/reports/pending')
      .set(authHeader(makeToken()));

    expect(res.status).toBe(403);
  });

  test('returns pending expenses for managers', async () => {
    const res = await request(app)
      .get('/api/reports/pending')
      .set(authHeader(makeManagerToken()));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.expenses)).toBe(true);
  });
});
