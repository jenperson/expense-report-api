const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || './data/expenses.db';

let db;

function getDb() {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

function initDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      department TEXT,
      role TEXT DEFAULT 'employee',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      receipt_url TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    );
  `);

  seedUsers(db);
}

function seedUsers(db) {
  const existing = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existing.count > 0) return;

  // Passwords are 'password123' — hashed with a simple placeholder for demo purposes.
  // In production, use bcrypt or argon2.
  const seedData = [
    { name: 'Alice Chen', email: 'alice@example.com', password_hash: '$demo$password123', department: 'Engineering', role: 'employee' },
    { name: 'Bob Martinez', email: 'bob@example.com', password_hash: '$demo$password123', department: 'Sales', role: 'employee' },
    { name: 'Carol Kim', email: 'carol@example.com', password_hash: '$demo$password123', department: 'Finance', role: 'manager' },
  ];

  const insert = db.prepare(
    'INSERT INTO users (name, email, password_hash, department, role) VALUES (?, ?, ?, ?, ?)'
  );

  for (const user of seedData) {
    insert.run(user.name, user.email, user.password_hash, user.department, user.role);
  }

  console.log('Database seeded with demo users');
}

module.exports = { getDb, initDb };
