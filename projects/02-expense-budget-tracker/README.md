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

## 🗄️ Database Models & Schemas (Day 14)

### 1. User Model (`src/models/user.model.js`)
* **Fields**:
  * `name`: User full name (string, 2–50 chars, required, trimmed).
  * `email`: Unique normalized email address (validated with regex, lowercase, trimmed).
  * `password`: Bcrypt-hashed password (minimum 6 chars, `select: false` by default).
  * `currency`: Default transaction currency (default: `'USD'`, supported: USD, EUR, GBP, INR, CAD, AUD, JPY, CNY, CHF, SGD, AED, BRL, ZAR, etc.).
  * `monthlyIncome`: Baseline monthly income for cashflow ratio tracking (min 0, default: 0).
  * `role`: User authorization level (`'user'` | `'admin'`).
  * `isActive`: Account status flag (boolean, default: true).
  * `lastLogin`: Timestamp of latest authenticated session.
* **Instance Methods**:
  * `comparePassword(candidatePassword)`: Verifies candidate plain password against stored bcrypt hash.
  * `toSafeObject()`: Returns user payload stripping password and `__v`.
  * `generateAuthToken(additionalPayload, options)`: Issues signed JWT token containing user identity and currency.
* **Static Methods**:
  * `findByEmail(email)`: Queries user by normalized lowercase email.
  * `isEmailTaken(email, excludeUserId)`: Validates email uniqueness with exclusion for profile updates.

### 2. Category Model (`src/models/category.model.js`)
* **Predefined vs. Custom Category Architecture**:
  * **System Predefined Categories**: Global, curated financial categories (`isPredefined: true`, `user: null`) accessible to all users. Immutable against regular user modification or deletion.
  * **User Custom Categories**: Personalized categories created by individual users (`isPredefined: false`, `user: ObjectId`). Isolated and manageable exclusively by their creator.
* **Fields**:
  * `name`: Category label (string, 2–50 chars, required, trimmed).
  * `slug`: URL-friendly auto-generated slug (e.g. `'food-dining'`, `'housing-rent'`).
  * `type`: Financial flow classification (`'expense'` | `'income'`).
  * `icon`: Frontend icon identifier (e.g. `'utensils'`, `'car'`, `'home'`, default: `'tag'`).
  * `color`: Hex color code for charts and UI (default: `'#6B7280'`, validated against hex format).
  * `description`: Optional descriptive notes (up to 200 chars).
  * `isPredefined`: Boolean flag separating system categories from user custom categories.
  * `user`: User reference ObjectId (`null` for system categories; required for custom categories).
  * `isActive`: Soft deletion / active status toggle.
* **Compound Indexes**:
  * `{ name: 1, type: 1, user: 1 }`: Guarantees unique category naming per type per user (and system-wide).
  * `{ user: 1, isActive: 1, type: 1 }`: Optimized index for multi-tenant category lookups.
  * `{ isPredefined: 1, isActive: 1 }`: Fast retrieval of active global system categories.
* **Static Methods**:
  * `getPredefinedCategories(type)`: Fetches active system categories with optional type filter.
  * `getCategoriesForUser(userId, options)`: Returns all active predefined categories combined with user custom categories.
  * `seedPredefinedCategories()`: Idempotently populates default system categories without duplication.
  * `findAccessibleById(categoryId, userId)`: Resolves category by ID if it is either predefined or owned by user.
  * `isNameTaken(name, type, userId, excludeCategoryId)`: Checks for name conflicts across accessible categories.
* **Instance Methods**:
  * `canModify(userId)`: Restricts modification permissions strictly to custom category owners.

---

## 📅 Roadmap for Project 02 (Days 13–24)

- [x] **Day 13**: Project workspace initialization, package.json, environment config, Express server, health check, MongoDB connection & database architecture
- [x] **Day 14**: User Account & Category Models with predefined vs custom categories
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
