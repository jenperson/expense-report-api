require('dotenv').config();

const express = require('express');
const { initDb } = require('./db/database');

const expensesRouter = require('./routes/expenses');
const reportsRouter = require('./routes/reports');
const categoriesRouter = require('./routes/categories');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/categories', categoriesRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

initDb();

app.listen(PORT, () => {
  console.log(`expense-report-api running on port ${PORT}`);
});

module.exports = app;
