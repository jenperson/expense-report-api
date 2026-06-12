const express = require("express");
const { getDb } = require("../db/database");
const { requireAuth, requireManager } = require("../middleware/auth");

const router = express.Router();

// GET /api/reports/summary
// Query params: start_date (required), end_date (required), status
router.get("/summary", requireAuth, (req, res) => {
  const { start_date, end_date, status } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: "start_date and end_date are required" });
  }

  const db = getDb();
  const userId = req.user.id;

  let query = `
    SELECT
      category,
      COUNT(*) as count,
      SUM(amount) as total,
      currency
    FROM expenses
    WHERE user_id = ?
      AND date >= ?
      AND date <= ?
  `;
  const params = [userId, start_date, end_date];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  query += " GROUP BY category, currency ORDER BY total DESC";

  const rows = db.prepare(query).all(...params);

  // FIX: Calculate grand total with proper rounding to avoid floating point precision issues
  // Also determine the primary currency from the results
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);
  
  // Determine currencies present in the results
  const currencies = [...new Set(rows.map(row => row.currency))];
  const primaryCurrency = currencies.length === 1 ? currencies[0] : "USD";

  res.json({
    period: { start_date, end_date },
    by_category: rows,
    grand_total: Math.round(grandTotal * 100) / 100, // Round to 2 decimal places
    currency: primaryCurrency,
  });
});

// GET /api/reports/pending  (manager only)
router.get("/pending", requireAuth, requireManager, (req, res) => {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      e.*,
      u.name as submitter_name,
      u.email as submitter_email,
      u.department
    FROM expenses e
    JOIN users u ON e.user_id = u.id
    WHERE e.status = 'pending'
    ORDER BY e.created_at ASC
  `).all();

  res.json({ expenses: rows, count: rows.length });
});

module.exports = router