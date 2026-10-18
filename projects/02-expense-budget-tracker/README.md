# Project 02: Expense & Budget Tracker API

A production-grade RESTful backend service for managing personal and team financial transactions, categorical spending limits, expense analytics with MongoDB Aggregation pipelines, recurring subscription tracking, and budget variance monitoring.

---

## 📌 Features & Architecture

- **Transaction Management**: Record and track income and expense entries with payment method, tags, receipts, and multi-tenant user isolation.
- **Category System**: Standard system categories with support for custom user-defined spending categories with strict ownership boundaries.
- **Budget Tracking & Threshold Alerts**: Set monthly budget limits per category or overall spending with proactive threshold warnings (e.g. 80% warning, >100% exceeded).
- **Advanced Aggregation Pipelines**:
  - Category-wise spending breakdown and percentage distributions using `$group` and `$lookup`.
  - 12-Month timeline cashflow trends comparing income vs expenses, net savings, and savings rate.
  - Executive financial summary dashboard with live telemetry.
- **Filtering & Search**: Filter by category, payment method, tag, amount range, recurring flag, keyword regex search, and arbitrary ISO date ranges.
- **Recurring Commitments**: Track active subscriptions, frequencies (daily, weekly, biweekly, monthly, quarterly, yearly), next due dates, and projected monthly cost.
- **Export Capabilities**: Structured exports in RFC 4180 CSV and JSON formats with comprehensive audit metadata.

---

## 🏗️ Folder Structure

```
projects/02-expense-budget-tracker/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── src/
│   ├── config/         # Environment loader & resilient MongoDB connection manager
│   ├── controllers/    # Controllers (health, auth, category, expense, budget, analytics, export)
│   ├── middleware/     # Auth (JWT & RBAC), Joi validation, 404 & centralized error handlers
│   ├── models/         # Mongoose schemas (User, Category, Expense, Budget)
│   ├── routes/         # Express routing definitions
│   ├── utils/          # API envelopes, custom ApiError, query builder, token manager
│   ├── app.js          # Express app configuration & middleware pipeline
│   └── index.js        # Server bootstrap entry point with graceful shutdown
└── test/               # Node.js native test runner suites (106 tests, 20 suites)
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

### Authentication & Account
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register new user account | None |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue signed JWT | None |
| `GET` | `/api/v1/auth/me` | Get authenticated user profile | Bearer JWT |
| `PATCH` | `/api/v1/auth/profile` | Update profile (name, currency, monthlyIncome) | Bearer JWT |
| `POST` | `/api/v1/auth/change-password` | Change account password | Bearer JWT |

### Category Management
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/categories` | List accessible categories (predefined + custom) | Bearer JWT |
| `GET` | `/api/v1/categories/:id` | Get category details by ID | Bearer JWT |
| `POST` | `/api/v1/categories` | Create custom category for authenticated user | Bearer JWT |
| `PATCH` | `/api/v1/categories/:id` | Update custom category (name, color, icon, etc.) | Bearer JWT |
| `DELETE` | `/api/v1/categories/:id` | Delete custom category | Bearer JWT |

### Expenses & Transactions
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/expenses` | Query transactions with filters, search, pagination | Bearer JWT |
| `POST` | `/api/v1/expenses` | Record a new expense or income transaction | Bearer JWT |
| `GET` | `/api/v1/expenses/recurring` | List recurring subscriptions & projected monthly cost | Bearer JWT |
| `GET` | `/api/v1/expenses/:id` | Get single transaction by ID | Bearer JWT |
| `PATCH` | `/api/v1/expenses/:id` | Update transaction details | Bearer JWT |
| `DELETE` | `/api/v1/expenses/:id` | Delete transaction | Bearer JWT |

### Budgets & Alerts
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/budgets` | List configured monthly budgets | Bearer JWT |
| `POST` | `/api/v1/budgets` | Create monthly budget limit for category or total | Bearer JWT |
| `GET` | `/api/v1/budgets/status` | Real-time budget tracking & over-budget alerts | Bearer JWT |
| `GET` | `/api/v1/budgets/:id` | Get budget details and live variance status | Bearer JWT |
| `PATCH` | `/api/v1/budgets/:id` | Update budget limit or alert threshold | Bearer JWT |
| `DELETE` | `/api/v1/budgets/:id` | Delete budget limit | Bearer JWT |

### Financial Analytics & Aggregations
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/category-breakdown` | Category spend breakdown & percentages | Bearer JWT |
| `GET` | `/api/v1/analytics/monthly-cashflow` | 12-Month cashflow trends (income vs expense) | Bearer JWT |
| `GET` | `/api/v1/analytics/summary` | Executive financial overview dashboard | Bearer JWT |

### Data Export
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/export/csv` | Download transactions as RFC 4180 CSV | Bearer JWT |
| `GET` | `/api/v1/export/json` | Download transactions as structured JSON audit file | Bearer JWT |

---

## 🗄️ Database Models & Schemas

### 1. User Model (`src/models/user.model.js`)
* **Fields**: `name`, `email` (unique, lowercase), `password` (bcrypt, excluded by default), `currency`, `monthlyIncome`, `role` (`user`|`admin`), `isActive`, `lastLogin`.
* **Methods**: `comparePassword`, `toSafeObject`, `generateAuthToken`, `findByEmail`, `isEmailTaken`.

### 2. Category Model (`src/models/category.model.js`)
* **Architecture**: System Predefined Categories (`isPredefined: true`, `user: null`) + User Custom Categories (`user: ObjectId`).
* **Fields**: `name`, `slug`, `type` (`expense`|`income`), `icon`, `color` (hex), `description`, `isPredefined`, `user`, `isActive`.
* **Methods**: `canModify(userId)`, `toSafeObject`, `getPredefinedCategories`, `getCategoriesForUser`, `findAccessibleById`, `isNameTaken`.

### 3. Expense Model (`src/models/expense.model.js`)
* **Fields**: `user`, `category`, `title`, `amount` (>0), `currency`, `type` (`expense`|`income`), `paymentMethod` (`cash`, `credit_card`, `debit_card`, `bank_transfer`, `upi`, `crypto`, `other`), `date`, `notes`, `receiptUrl`, `tags`, `isRecurring`, `recurring` (`frequency`, `nextDueDate`, `endDate`), `status`.
* **Compound Indexes**: `{ user: 1, date: -1 }`, `{ user: 1, type: 1, date: -1 }`, `{ user: 1, category: 1, date: -1 }`, `{ user: 1, tags: 1 }`, `{ user: 1, isRecurring: 1 }`.
* **Static Methods**: `getMonthlySpend(userId, { month, year, categoryId })`, `getCategoryAnalytics(userId, filterOptions)`, `getMonthlyCashflow(userId, year)`.

### 4. Budget Model (`src/models/budget.model.js`)
* **Fields**: `user`, `category` (null for overall budget), `month` (1-12), `year`, `limit`, `currency`, `alertThreshold` (default 80%), `notes`.
* **Unique Compound Index**: `{ user: 1, category: 1, month: 1, year: 1 }`.
* **Methods**: `calculateStatus(spentAmount)` (computes spent, remaining, percentUsed, status: `'normal'` | `'warning'` | `'exceeded'`).

---

## 📅 Roadmap for Project 02 (Days 13–24) - `Completed`

- [x] **Day 13**: Project workspace initialization, package.json, environment config, Express server, health check, MongoDB connection & database architecture
- [x] **Day 14**: User Account & Category Models with predefined vs custom categories
- [x] **Day 15**: Expense Model & Validation with receipt notes, payment methods, tags, and date indexing
- [x] **Day 16**: Expense CRUD APIs with multi-tenant user isolation
- [x] **Day 17**: Date-range filtering & category-based querying
- [x] **Day 18**: Monthly Budget Model & Budget Limit configuration
- [x] **Day 19**: Budget tracking & Over-budget alert triggers
- [x] **Day 20**: Aggregation Pipeline: Category breakdown & monthly spend analytics
- [x] **Day 21**: Aggregation Pipeline: Income vs Expense cashflow summaries
- [x] **Day 22**: Recurring Expenses / Subscription tracking
- [x] **Day 23**: Data export concepts (CSV/JSON summary)
- [x] **Day 24**: Comprehensive test suites, performance indexing & complete documentation
