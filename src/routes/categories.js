const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const CATEGORIES = [
  { id: 'travel', label: 'Travel', description: 'Flights, trains, taxis, rideshares, and mileage reimbursement' },
  { id: 'meals', label: 'Meals & Entertainment', description: 'Client meals, team lunches, and approved entertainment' },
  { id: 'lodging', label: 'Lodging', description: 'Hotels and short-term accommodation for business travel' },
  { id: 'office', label: 'Office Supplies', description: 'Equipment, software, and supplies for business use' },
  { id: 'other', label: 'Other', description: 'Any approved business expense not covered by the above categories' },
];

// GET /api/categories
router.get('/', requireAuth, (req, res) => {
  res.json({ categories: CATEGORIES });
});

module.exports = router;
