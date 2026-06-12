const express = require("express");
const { getDb } = require("../db/database");
const { requireAuth } = require("../middleware/auth");
const { validateExpense, validateExpenseUpdate } = require("../middleware/validation");
const { convertToUSD, fetchExchangeRates } = require("../utils/exchangeRates");

const router = express.Router();

// GET /api/expenses
// Query params: category, status, start_date, end_date
router.get("/", requireAuth, (req, res) => {
  const db = getDb();
  const { category, status, start_date, end_date } = req.query;
  const userId = req.user.id;

  let query = "SELECT * FROM expenses WHERE user_id = ?";
  const params = [userId];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }

  if (start_date) {
    query += " AND date >= ?";
    params.push(start_date);
  }

  if (end_date) {
    query += " AND date <= ?";
    params.push(end_date);
  }

  // FIX: Changed category_name to category
  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  query += " ORDER BY date DESC";

  const rows = db.prepare(query).all(...params);
  res.json({ expenses: rows, count: rows.length });
});

// POST /api/expenses
router.post("/", requireAuth, validateExpense, async (req, res) => {
  try {
    const db = getDb();
    const { amount, currency, category, description, date, receipt_url } = req.body;
    const userId = req.user.id;

    // Fetch exchange rates to ensure we have the latest
    await fetchExchangeRates();

    // Calculate USD equivalent
    const amountUsd = convertToUSD(amount, currency);

    const result = db.prepare(`
      INSERT INTO expenses (user_id, amount, amount_usd, currency, category, description, date, receipt_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, amount, amountUsd, currency, category, description, date, receipt_url || null);

    const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json(expense);
  } catch (error) {
    console.error("Error creating expense:", error);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// GET /api/expenses/:id
router.get("/:id", requireAuth, (req, res) => {
  const db = getDb();
  const expense = db.prepare(
    "SELECT * FROM expenses WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  res.json(expense);
});

// PUT /api/expenses/:id
router.put("/:id", requireAuth, validateExpenseUpdate, (req, res) => {
  const db = getDb();
  const expense = db.prepare(
    "SELECT * FROM expenses WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  if (expense.status !== "pending") {
    return res.status(409).json({ error: "Only pending expenses can be updated" });
  }

  const fields = Object.keys(req.body);
  const setClauses = fields.map((f) => `${f} = ?`).join(", ");
  const values = fields.map((f) => req.body[f]);

  db.prepare(`UPDATE expenses SET ${setClauses} WHERE id = ?`).run(...values, req.params.id);

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/expenses/:id
router.delete("/:id", requireAuth, (req, res) => {
  const db = getDb();
  const expense = db.prepare(
    "SELECT * FROM expenses WHERE id = ? AND user_id = ?"
  ).get(req.params.id, req.user.id);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  if (expense.status !== "pending") {
    return res.status(409).json({ error: "Only pending expenses can be deleted" });
  }

  db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
  res.status(204).send();
});

// PUT /api/expenses/:id/approve  (manager only)
router.put("/:id/approve", requireAuth, (req, res) => {
  const db = getDb();

  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Manager role required" });
  }

  const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  if (expense.status !== "pending") {
    return res.status(409).json({ error: "Only pending expenses can be approved" });
  }

  db.prepare(`
    UPDATE expenses SET status = 'approved', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(req.user.id, req.params.id);

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// PUT /api/expenses/:id/reject  (manager only)
router.put("/:id/reject", requireAuth, (req, res) => {
  const db = getDb();

  if (req.user.role !== "manager") {
    return res.status(403).json({ error: "Manager role required" });
  }

  const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found" });
  }

  if (expense.status !== "pending") {
    return res.status(409).json({ error: "Only pending expenses can be rejected" });
  }

  db.prepare(`
    UPDATE expenses SET status = 'rejected', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(req.user.id, req.params.id);

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  res.json(updated);
});

module.exports = router