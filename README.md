# expense-report-api

A lightweight REST API for enterprise expense management. Employees can submit expense reports, managers can approve or reject them, and finance teams can query totals by category and date range.

Built with Node.js, Express, and SQLite (via better-sqlite3).

## Features

- Submit, update, and delete expense reports
- Approve or reject reports (manager role)
- Filter expenses by category, status, and date range
- Summarize totals by category for a given period
- JWT-based authentication

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port the server listens on | `3000` |
| `JWT_SECRET` | Secret key for signing JWTs | required |
| `JWT_EXPIRES_IN` | Token expiration duration | `8h` |
| `DB_PATH` | Path to the SQLite database file | `./data/expenses.db` |
| `NODE_ENV` | Environment | `development` |

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

The server starts on `http://localhost:3000` by default.

### Running Tests

```bash
npm test
```

## API Reference

All endpoints require a `Authorization: Bearer <token>` header except `/api/auth/login`.

### Authentication

#### POST /api/auth/login

```json
{
  "email": "alice@example.com",
  "password": "password123"
}
```

Returns a JWT token. Use this token in the `Authorization` header for all other requests.

**Seed accounts (development only):**

| Email | Password | Role |
|-------|----------|------|
| alice@example.com | password123 | employee |
| bob@example.com | password123 | employee |
| carol@example.com | password123 | manager |

### Expenses

#### GET /api/expenses

List the authenticated user's expenses.

**Query parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Filter by category: `travel`, `meals`, `lodging`, `office`, `other` |
| `status` | string | Filter by status: `pending`, `approved`, `rejected` |
| `start_date` | ISO date | Filter by date range start |
| `end_date` | ISO date | Filter by date range end |

#### POST /api/expenses

Submit a new expense.

```json
{
  "amount": 125.50,
  "currency": "USD",
  "category": "travel",
  "description": "Taxi to client site - Q2 planning meeting",
  "date": "2026-06-09",
  "receipt_url": "https://receipts.example.com/abc123"
}
```

#### GET /api/expenses/:id

Get a single expense by ID.

#### PUT /api/expenses/:id

Update an expense (only while status is `pending`).

#### DELETE /api/expenses/:id

Delete an expense (only while status is `pending`).

### Reports

#### GET /api/reports/summary

Get expense totals grouped by category for a date range.

**Query parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `start_date` | ISO date | yes | Period start |
| `end_date` | ISO date | yes | Period end |
| `status` | string | no | Filter by approval status |

#### GET /api/reports/pending

List all pending expense reports (manager role required).

### Categories

#### GET /api/categories

List all valid expense categories with descriptions.

## Data Model

### Expense

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Auto-incremented primary key |
| `user_id` | integer | FK to users table |
| `amount` | real | Expense amount |
| `currency` | text | ISO 4217 currency code |
| `category` | text | Expense category |
| `description` | text | Description of the expense |
| `date` | text | Expense date (ISO 8601) |
| `receipt_url` | text | Optional URL to receipt image |
| `status` | text | `pending`, `approved`, or `rejected` |
| `created_at` | datetime | Record creation timestamp |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.
