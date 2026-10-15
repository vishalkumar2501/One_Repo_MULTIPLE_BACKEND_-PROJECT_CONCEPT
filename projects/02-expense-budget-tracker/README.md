# Project 02: Expense & Budget Tracker API

A production-grade RESTful backend service for managing personal and team financial transactions, categorical spending limits, expense analytics with MongoDB Aggregation pipelines, and budget variance monitoring.

---

## 📌 Features & Architecture

- **Transaction Management**: Record and track income and expense entries with payment method, tags, receipts, and multi-tenant user isolation.
- **Category System**: Standard system categories with support for custom user-defined spending categories.
- **Budget Tracking & Threshold Alerts**: Set monthly budget limits per category with proactive threshold warnings (e.g. 80%, 100% exceeded).
- **Advanced Aggregation Pipelines**:
  - Category-wise spending breakdown and percentage distributions using `$group` and `$facet`.
  - Monthly timeline cashflow trends comparing income vs expenses.
  - Daily/weekly spending velocity and average ticket size calculations.
- **Filtering & Search**: Filter by category, payment method, tag, amount range, and arbitrary date ranges.
- **Export Capabilities**: Structured exports for monthly summary and audit trails.

---

## 🏗️ Folder Structure

```
projects/02-expense-budget-tracker/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── src/
│   ├── config/         # Environment variables & MongoDB connection manager
│   ├── controllers/    # API controllers (health, auth, expense, budget, analytics)
│   ├── middleware/     # Auth, Joi validation, 404 & centralized error handlers
│   ├── models/         # Mongoose schemas & models (User, Category, Expense, Budget)
│   ├── routes/         # Express routing definitions
│   ├── utils/          # API response envelopes, custom error classes, helpers
│   ├── app.js          # Express app configuration & middleware pipeline
│   └── index.js        # Server bootstrap entry point with graceful shutdown
└── test/               # Node.js native test runner suites
```

---

## 🚦 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   ```bash
   cp .env.example .env
   ```

3. **Start the Server**:
   ```bash
   # Development mode with nodemon auto-reload
   npm run dev

   # Production mode
   npm start
   ```

4. **Run Automated Test Suites**:
   ```bash
   npm test
   ```

---

## 📡 API Endpoints

### System & Diagnostics
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API welcome payload and available endpoints | None |
| `GET` | `/api/v1/health` | Service uptime and MongoDB connection state | None |
| `GET` | `/health` | Root health ping alias | None |

---

## 📅 Roadmap for Project 02 (Days 13–24)

- [x] **Day 13**: Project workspace initialization, package.json, environment config, Express server, health check, MongoDB connection & database architecture
- [ ] **Day 14**: User Account & Category Models with predefined vs custom categories
- [ ] **Day 15**: Expense Model & Validation with receipt notes, payment methods, tags, and date indexing
- [ ] **Day 16**: Expense CRUD APIs with multi-tenant user isolation
- [ ] **Day 17**: Date-range filtering & category-based querying
- [ ] **Day 18**: Monthly Budget Model & Budget Limit configuration
- [ ] **Day 19**: Budget tracking & Over-budget alert triggers
- [ ] **Day 20**: Aggregation Pipeline: Category breakdown & monthly spend analytics
- [ ] **Day 21**: Aggregation Pipeline: Income vs Expense cashflow summaries
- [ ] **Day 22**: Recurring Expenses / Subscription tracking
- [ ] **Day 23**: Data export concepts (CSV/JSON summary)
- [ ] **Day 24**: Comprehensive test suites, performance indexing & complete documentation
