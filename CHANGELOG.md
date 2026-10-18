# Changelog

All notable changes across all backend projects in this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Days 15–24] - 2026-10-18

### Added
- **Project 02 (Expense & Budget Tracker) - Completed (Days 15–24)**:
  - **Authentication & Authorization Layer (`src/middleware/auth.js`, `src/controllers/auth.controller.js`, `src/routes/auth.routes.js`)**:
    - Implemented `authenticate` / `protect` middleware verifying Bearer JWT tokens, database user existence, and active account status.
    - Role-Based Access Control (RBAC) middleware `authorize(...roles)`.
    - Endpoints for `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `GET /api/v1/auth/me`, `PATCH /api/v1/auth/profile`, and `POST /api/v1/auth/change-password`.
  - **Category Management APIs (`src/controllers/category.controller.js`, `src/routes/category.routes.js`)**:
    - `GET /api/v1/categories`: fetches predefined system categories merged with user custom categories, with optional `type` filter.
    - `GET /api/v1/categories/:id`: retrieves single accessible category with authorization enforcement.
    - `POST /api/v1/categories`: creates custom category for authenticated user with duplicate name checking.
    - `PATCH /api/v1/categories/:id` & `DELETE /api/v1/categories/:id`: strict authorization ensuring users can only modify/delete their own custom categories (predefined system categories protected with 403 Forbidden).
  - **Day 15: Expense & Transaction Model (`src/models/expense.model.js`, `src/validations/expense.validation.js`)**:
    - Mongoose schema with `user`, `category`, `title`, `amount` (>0), `currency`, `type` (`expense` | `income`), `paymentMethod` (`cash`, `credit_card`, `debit_card`, `bank_transfer`, `upi`, `crypto`, `other`), `date`, `notes`, `receiptUrl`, `tags`, `isRecurring`, `recurring` (`frequency`, `nextDueDate`, `endDate`), and `status`.
    - High-performance compound indexes: `{ user: 1, date: -1 }`, `{ user: 1, type: 1, date: -1 }`, `{ user: 1, category: 1, date: -1 }`, `{ user: 1, tags: 1 }`, and `{ user: 1, isRecurring: 1 }`.
    - Joi validation schemas for creating, updating, and querying transactions.
  - **Day 16 & 17: Expense CRUD APIs, Date-Range Filtering & Query Builder (`src/controllers/expense.controller.js`, `src/routes/expense.routes.js`, `src/utils/queryBuilder.js`)**:
    - Full CRUD endpoints (`GET /api/v1/expenses`, `POST /api/v1/expenses`, `GET /api/v1/expenses/:id`, `PATCH /api/v1/expenses/:id`, `DELETE /api/v1/expenses/:id`) enforcing multi-tenant isolation.
    - Validation verifying category accessibility and matching type (`expense` vs `income`).
    - Query builder engine supporting date range (`startDate`, `endDate`), amount range (`minAmount`, `maxAmount`), multi-tag matching (`$in`), payment method, recurring flag, and regex searching on title and notes.
    - Deterministic sorting whitelist and bidirectional pagination metadata.
  - **Day 18 & 19: Monthly Budget Model, Budget Limits & Alert Triggers (`src/models/budget.model.js`, `src/validations/budget.validation.js`, `src/controllers/budget.controller.js`, `src/routes/budget.routes.js`)**:
    - Mongoose budget model with compound unique index `{ user: 1, category: 1, month: 1, year: 1 }` supporting category-specific or overall monthly budgets.
    - Dynamic variance calculation method `calculateStatus(spent)` computing spent, remaining, percentage used, and alert status (`normal`, `warning` when exceeding `alertThreshold` %, `exceeded` when > 100%).
    - Real-time budget tracking endpoint `GET /api/v1/budgets/status` comparing live expenses against configured limits.
    - Endpoints for `POST /api/v1/budgets`, `GET /api/v1/budgets`, `GET /api/v1/budgets/:id`, `PATCH /api/v1/budgets/:id`, and `DELETE /api/v1/budgets/:id`.
  - **Day 20 & 21: Aggregation Pipelines - Category Analytics & Cashflow (`src/controllers/analytics.controller.js`, `src/routes/analytics.routes.js`)**:
    - MongoDB `$group` and `$lookup` aggregation pipeline `Expense.getCategoryAnalytics` generating category-wise spend breakdowns, counts, averages, min/max amounts, and calculated percentages of total spend.
    - 12-Month aggregation pipeline `Expense.getMonthlyCashflow` comparing monthly income vs expense, net savings, and savings rate.
    - Executive dashboard summary endpoint `GET /api/v1/analytics/summary` aggregating monthly spend, top category, recent transactions, and active budget alert counts.
  - **Day 22: Recurring Subscriptions Tracking (`src/controllers/expense.controller.js`)**:
    - Endpoint `GET /api/v1/expenses/recurring` returning active subscriptions, recurring frequencies, next due dates, and projected monthly cost commitment.
  - **Day 23: Data Export Concepts (`src/controllers/export.controller.js`, `src/routes/export.routes.js`)**:
    - Downloadable RFC 4180 CSV export endpoint `GET /api/v1/export/csv` with sanitized header rows and field escaping.
    - Structured JSON audit export endpoint `GET /api/v1/export/json` including user metadata, export timestamps, total income/expense summaries, and complete transaction lists.
  - **Day 24: Comprehensive Automated Test Suites & Documentation (`test/`)**:
    - Added `test/auth.api.test.js`: registration, login, profile, password change integration tests.
    - Added `test/category.api.test.js`: category listing, custom creation, 403 immutability enforcement on predefined categories.
    - Added `test/expense.model.test.js`: validation of required fields, positive amounts, payment methods, recurring frequencies.
    - Added `test/queryBuilder.test.js`: regex escaping, comma parsing, filter building, sorting, pagination math.
    - Added `test/expense.api.test.js`: transaction CRUD, category type mismatch validation, pagination, multi-tenant isolation, subscriptions.
    - Added `test/budget.api.test.js`: budget CRUD, duplicate prevention, live variance calculation, warning & exceeded alert tracking.
    - Added `test/analytics.api.test.js`: category breakdown percentages, 12-month cashflows, executive summary dashboard.
    - Added `test/export.api.test.js`: CSV format headers and quoting, JSON metadata and summaries.
    - Project 02 test suite expanded to 106 passing tests across 20 suites (0 failures).
    - Updated Project 02 README with full endpoint directory, schema documentation, and roadmap completion.
    - Updated repository `ROADMAP.md` setting Project 02 status to `Completed`.

---

## [Day 14] - 2026-10-17

### Added
- **Project 02 (Expense & Budget Tracker)**:
  - User Account Model & Security Layer (`src/models/user.model.js`):
    - Implemented User Mongoose schema with fields for `name`, unique normalized `email`, bcrypt-hashed `password` (excluded by default from projections), default `currency` (USD, EUR, GBP, INR, CAD, etc.), baseline `monthlyIncome`, `role` (`user` | `admin`), and account status flags.
    - Pre-save lifecycle hook with salt generation and bcrypt hashing for password modifications.
    - Added instance methods: `comparePassword`, `toSafeObject`, and `generateAuthToken` (JWT signing).
    - Added static helper methods: `findByEmail` and `isEmailTaken`.
  - Category Model with Predefined vs. Custom Category Architecture (`src/models/category.model.js`):
    - Designed unified category system supporting system-wide predefined categories and user-specific custom categories.
    - Built-in system predefined categories (11 standard expense categories: Food & Dining, Housing & Rent, Utilities, Transportation, Healthcare, Entertainment, Shopping, Education, Personal Care, Travel, Miscellaneous; 5 income categories: Salary, Freelance & Consulting, Investments & Dividends, Gifts & Grants, Other Income).
    - Added pre-validation hooks for automatic URL-friendly slug generation and strict constraint validation (`user: null` for predefined; required `user` ObjectId for custom categories).
    - Created compound indexes: `{ name: 1, type: 1, user: 1 }` (unique category names per user/type), `{ user: 1, isActive: 1, type: 1 }`, and `{ isPredefined: 1, isActive: 1 }`.
    - Added authorization method `canModify(userId)` restricting editing/deletion rights solely to the custom category owner.
    - Implemented static query methods: `getPredefinedCategories`, `getCategoriesForUser`, `findAccessibleById`, `isNameTaken`, and idempotent seeder `seedPredefinedCategories`.
  - Authentication Token Utility (`src/utils/token.js`):
    - Added JWT `generateToken`, `verifyToken` with structured ApiError 401 handling (expired/tampered/invalid), and `decodeToken`.
  - Request Validation Layer (`src/validations/` & `src/middleware/validate.js`):
    - Added `user.validation.js`: Joi schemas for `registerSchema`, `loginSchema`, `updateProfileSchema`, and `changePasswordSchema`.
    - Added `category.validation.js`: Joi schemas for `createCategorySchema`, `updateCategorySchema`, and `queryCategorySchema`.
    - Implemented reusable Joi `validate` middleware with field error formatting and payload sanitization.
  - Automated Test Suites:
    - Added JWT Token utility unit test suite (`test/token.test.js`).
    - Added User model & schema unit test suite (`test/user.model.test.js`).
    - Added Category model & predefined vs custom constraints unit test suite (`test/category.model.test.js`).
    - Added Joi schemas and validation middleware unit test suite (`test/validation.test.js`).
    - 65 test cases passing across 12 test suites in Project 02 (0 failures).
  - Documentation & Roadmap:
    - Updated Project 02 README with detailed schema definitions, methods, and Day 14 roadmap completion.
    - Updated repository `ROADMAP.md` checking off Day 14.

---

## [Day 13] - 2026-10-16

### Added
- **Project 02 (Expense & Budget Tracker)**:
  - Initialized Project 02 Workspace & Architecture (`projects/02-expense-budget-tracker`):
    - Created dedicated `package.json` with scripts for `start`, `dev` (nodemon), and `test` (Node.js test runner).
    - Configured `.env.example` and `.gitignore` preventing sensitive credential leaks.
    - Added structured environment loader (`src/config/env.js`) with frozen configuration immutability, port defaulting (5001), and MongoDB URI configuration.
    - Implemented resilient Mongoose connection manager (`src/config/db.js`) featuring exponential backoff retry logic, lifecycle event listeners, state introspection (`getConnectionState`), and clean disconnection (`disconnectDB`).
    - Built standardized REST API response envelope (`src/utils/apiResponse.js`) and structured operational error class (`src/utils/apiError.js`).
    - Implemented async controller error-forwarding wrapper (`src/utils/asyncHandler.js`).
    - Implemented 404 Not Found (`src/middleware/notFound.js`) and global centralized error handling middleware (`src/middleware/errorHandler.js`).
    - Configured health check controller and routes (`src/controllers/health.controller.js` & `src/routes/health.routes.js`) exposing uptime, memory telemetry, and database connectivity.
    - Configured Express application pipeline (`src/app.js`) and server bootstrap with graceful shutdown handlers (`src/index.js`) for SIGINT, SIGTERM, uncaughtException, and unhandledRejection.
  - Automated Test Suites:
    - Added Configuration unit test suite (`test/config.test.js`).
    - Added Database connection retry and lifecycle unit tests (`test/db.test.js`).
    - Added Express app and Health check integration tests (`test/app.test.js`).
    - Added ApiError & ApiResponse unit tests (`test/utils.test.js`).
    - Added AsyncHandler utility unit tests (`test/asyncHandler.test.js`).
    - 16 test cases passing across 5 suites.
  - Documentation & Workspace Updates:
    - Added comprehensive Project 02 README with architecture outline, endpoints, and Day 13–24 roadmap.
    - Updated root `package.json` with `start:project-02`, `dev:project-02`, and `test:project-02` scripts.
    - Updated repository `ROADMAP.md` marking Project 02 status as `In Progress` with Day 13 completed.

---

## [Day 12] - 2026-10-15

### Added
- **Project 01 (Job Application Tracker)**:
  - Implemented High-Performance MongoDB Multi-Facet Aggregation Pipeline (`src/models/application.model.js`):
    - Added `Application.getApplicationAnalytics(userId)` static method executing single-roundtrip `$facet` aggregation with strict multi-tenant `{ user: userId }` isolation.
    - Aggregated status breakdowns across all valid lifecycle states (`applied`, `interviewing`, `offered`, `rejected`, `withdrawn`) with automatic zero-default mapping.
    - Aggregated priority distributions (`low`, `medium`, `high`).
    - Aggregated job type distributions (`full-time`, `part-time`, `contract`, `internship`, `freelance`).
    - Aggregated work location models (`remote`, `hybrid`, `onsite`).
    - Computed operational overview metrics: `total`, `active`, `archived`, `pendingFollowUps`, and `totalInterviewStages`.
    - Computed interview stage outcomes (`scheduled`, `passed`, `failed`, `completed`, `cancelled`).
    - Extracted 12-month timeline application trends (`year`, `month`, `count`).
  - Implemented Application Statistics API Controller & Route (`src/controllers/application.controller.js` & `src/routes/application.routes.js`):
    - Added `applicationController.getApplicationStats` returning standard `200 OK` ApiResponse with formatted analytics payload.
    - Added route `GET /api/v1/applications/stats` protected by JWT `authenticate` middleware, positioned preceding parameterized routes to eliminate ID routing collisions.
    - Exposed `applicationStats` in root API welcome payload (`src/app.js`).
  - Added Comprehensive Automated Unit & Integration Test Suites:
    - Added unit test cases for `getStatusCountsByUser` and `getApplicationAnalytics` in `test/application.model.test.js`.
    - Added integration test suite `test/application.stats.api.test.js` validating authentication protection (401 Unauthorized), empty state zero-count defaults, active multi-facet metrics calculation, and cross-user multi-tenant isolation.
    - Total tests in Project 01 increased to 213 passing tests across 49 suites.
  - Finalized Project 01 Documentation & Roadmap:
    - Updated Project 01 README with endpoint specifications, request/response examples, and completed Day 1-12 roadmap.
    - Updated repository `ROADMAP.md` setting Project 01 to `Completed` status.

---

## [Day 11] - 2026-10-14

### Added
- **Project 01 (Job Application Tracker)**:
  - Built Modular Query Builder Engine (`src/utils/queryBuilder.js`):
    - `escapeRegex`: sanitizes incoming user search strings against regex metacharacters (`[-[\]{}()*+?.,\\^$|#\s]`), eliminating ReDoS vulnerabilities and unexpected pattern errors.
    - `parseCommaSeparated`: parses delimited or array query strings into trimmed, sanitized filter arrays.
    - `buildApplicationFilter`: constructs multi-tenant query objects enforcing `{ user: userId }` isolation across all filter combinations.
    - `buildSortOptions`: validates requested sort fields against an audited whitelist (`createdAt`, `updatedAt`, `applicationDate`, `company`, `position`, `priority`, `status`, `salary.min`, `salary.max`, `followUpDate`) and assigns directional sort indices (`1` for `asc`, `-1` for `desc`).
    - `buildPaginationMetadata`: calculates total pages, boundaries, and bidirectional traversal pointers (`hasNextPage`, `hasPrevPage`, `nextPage`, `prevPage`).
  - Advanced Multi-Criteria Query Support (`src/controllers/application.controller.js`):
    - Multi-value enum filtering for `status`, `jobType`, `workLocation`, and `priority` using `$in` matching.
    - Case-insensitive substring searching and text index querying (`search`, `searchType=regex` / `searchType=text`) across company, position, notes, and location.
    - Dedicated field-level searching on `company` and `position`.
    - Soft-archive state filtering (`isArchived`) and follow-up tracking (`hasFollowUp`).
    - Salary range filtering (`minSalary`, `maxSalary`) evaluating ranges against `salary.min` and `salary.max`.
    - Date range filtering (`fromDate` / `startDate` to `toDate` / `endDate`) on `applicationDate`.
  - Joi Schema Validation Enhancements (`src/validations/application.validation.js`):
    - Added `commaSeparatedEnumValidator` to accept both single enum strings and comma-delimited enum lists for `status`, `jobType`, `workLocation`, and `priority`.
    - Added validation rules for `searchType`, `company`, `position`, `minSalary`, `maxSalary`, `fromDate`, `toDate`, `startDate`, `endDate`, and `hasFollowUp`.
    - Expanded allowed `sortBy` whitelist.
  - Automated Test Suites:
    - Added QueryBuilder unit test suite (`test/queryBuilder.test.js`) verifying regex escaping, comma parsing, filter compilation, sort building, and pagination edge cases.
    - Added comprehensive integration test suite (`test/application.query.api.test.js`) covering keyword searching, text search fallback, regex safety, multi-enum filtering, date/salary range queries, sorting order, pagination metadata traversal, combined query scenarios, and 400 Bad Request validation rejections.
  - Updated Project 01 README documentation and marked Day 11 complete in `ROADMAP.md`.

---

## [Day 10] - 2026-10-11

### Added
- **Project 01 (Job Application Tracker)**:
  - Implemented Application Update & Delete Controllers (`src/controllers/application.controller.js`):
    - `updateApplication`: updates existing application fields via `PUT` or `PATCH` with strict user ownership enforcement (`{ _id: id, user: req.user._id }`), deep merging of nested subdocuments (`salary`, `contact`), conditional status transition cleanup (clearing `rejectionReason` when moving to non-rejected states), and returning 200 OK.
    - `deleteApplication`: deletes application document ensuring multi-tenant user ownership verification, throwing 404 Not Found if attempting to access another user's document, and returning 200 OK with confirmation.
    - `updateApplicationStatus`: dedicated handler (`PATCH /api/v1/applications/:id/status`) utilizing model `updateStatus` lifecycle method to update status and record/clear rejection reason with ownership verification.
    - `addInterviewStage`: dedicated handler (`POST /api/v1/applications/:id/interview-stages`) appending an interview stage subdocument, automatically advancing status from `applied` to `interviewing`, and returning 201 Created.
    - `archiveApplication` and `unarchiveApplication`: dedicated handlers (`PATCH /api/v1/applications/:id/archive` & `PATCH /api/v1/applications/:id/unarchive`) managing soft-archive state with strict ownership verification.
  - Implemented Application Update & Delete Routes (`src/routes/application.routes.js`):
    - Added `PUT /api/v1/applications/:id` with `updateApplicationSchema` validation.
    - Added `PATCH /api/v1/applications/:id` with `updateApplicationSchema` validation.
    - Added `DELETE /api/v1/applications/:id` with `applicationIdParamSchema` validation.
    - Added `PATCH /api/v1/applications/:id/status` with `updateStatusSchema` validation.
    - Added `POST /api/v1/applications/:id/interview-stages` with `addInterviewStageSchema` validation.
    - Added `PATCH /api/v1/applications/:id/archive` with `applicationIdParamSchema` validation.
    - Added `PATCH /api/v1/applications/:id/unarchive` with `applicationIdParamSchema` validation.
  - Added comprehensive automated integration test suite (`test/application.update-delete.api.test.js`):
    - 22 integration tests covering PUT full updates, PATCH partial field updates, nested salary preservation, multi-tenant ownership security checks (404 Not Found on cross-user updates/deletions), empty payload rejection (`min(1)`), malformed ObjectId parameter validation, invalid enum validation, DELETE lifecycle, status transition logic with rejection reason tracking, interview stage appending with auto-advance, and archive/unarchive operations.
  - Updated Project 01 README documentation and marked Day 10 complete in `ROADMAP.md`.

---

## [Day 9] - 2026-10-10

### Added
- **Project 01 (Job Application Tracker)**:
  - Implemented Job Application Controller (`src/controllers/application.controller.js`):
    - `createApplication`: creates application document directly linked to authenticated user ID (`req.user._id`), returning 201 Created with standardized payload.
    - `getApplications`: retrieves applications for authenticated user with strict user isolation, supporting full-text search (`$text`), attribute filters (`status`, `jobType`, `workLocation`, `priority`, `isArchived`), customizable sorting, and pagination metadata (`total`, `page`, `limit`, `totalPages`, `hasNextPage`, `hasPrevPage`).
    - `getApplicationById`: fetches single application by ID with multi-tenant ownership verification, throwing 404 Not Found when attempting to access applications belonging to other users.
  - Implemented Job Application Routes (`src/routes/application.routes.js`):
    - Enforced `authenticate` JWT middleware across all application endpoints.
    - Configured `POST /api/v1/applications` with `createApplicationSchema` validation.
    - Configured `GET /api/v1/applications` with `queryApplicationsSchema` validation.
    - Configured `GET /api/v1/applications/:id` with `applicationIdParamSchema` validation.
  - Integrated application routing into Express application pipeline (`src/app.js`) at `/api/v1/applications` and exposed in root `/` API directory.
  - Added comprehensive automated integration test suite (`test/application.api.test.js`):
    - 14 tests verifying application creation (201 Created), validation rejection on required fields and negative salary (400 Bad Request), authentication enforcement (401 Unauthorized), listing with pagination bounds and filters, strict user isolation across multi-user environments, single item retrieval (200 OK), non-existent and cross-user isolation 404 responses, and malformed ObjectId parameter validation (400 Bad Request).
  - Updated Project 01 README documentation and marked Day 9 complete in `ROADMAP.md`.

---

## [Day 8] - 2026-10-08

### Added
- **Project 01 (Job Application Tracker)**:
  - Implemented Job Application Schema & Model (`src/models/application.model.js`):
    - Exported domain lifecycle enums: `APPLICATION_STATUS` (`applied`, `interviewing`, `offered`, `rejected`, `withdrawn`), `JOB_TYPE` (`full-time`, `part-time`, `contract`, `internship`, `freelance`), `WORK_LOCATION` (`remote`, `hybrid`, `onsite`), `APPLICATION_PRIORITY` (`low`, `medium`, `high`), `SALARY_PERIOD` (`yearly`, `monthly`, `hourly`), and `INTERVIEW_STAGE_STATUS` (`scheduled`, `completed`, `cancelled`, `passed`, `failed`).
    - Configured multi-tenant user association (`user: ObjectId, ref: 'User'`) with dedicated indexing.
    - Added nested `salary` subdocument with cross-field validation ensuring `min <= max`.
    - Added embedded `interviewStages` subdocument schema with date, interviewer, stage status, and feedback tracking.
    - Configured compound indexes (`{ user: 1, status: 1 }`, `{ user: 1, applicationDate: -1 }`, `{ user: 1, createdAt: -1 }`, `{ user: 1, isArchived: 1 }`).
    - Configured weighted full-text search index (`company: 10`, `position: 8`, `location: 3`, `notes: 1`).
    - Implemented instance methods: `addInterviewStage`, `updateStatus` (with conditional `rejectionReason` lifecycle handling), `archive`, and `unarchive`.
    - Implemented static query helpers: `findByUser` and aggregation method `getStatusCountsByUser`.
  - Implemented Joi validation schemas (`src/validations/application.validation.js`):
    - `createApplicationSchema`: validates company, position, types, locations, salary, urls, contacts, notes, dates, and priorities.
    - `updateApplicationSchema`: validates partial updates with minimum 1 field requirement and ObjectId verification.
    - `applicationIdParamSchema`: validates MongoDB ObjectId URL parameters.
    - `addInterviewStageSchema`: validates interview stage subdocument payloads.
    - `updateStatusSchema`: validates application status transitions and rejection notes.
    - `queryApplicationsSchema`: validates search keywords, filters, pagination bounds (limit max 100), and sorting fields.
  - Added comprehensive automated test suites:
    - `test/application.model.test.js`: 15 unit tests verifying model validation, required attributes, length constraints, enum guards, default values, salary rules, interview stage subdocuments, methods (`addInterviewStage`, `updateStatus`, `archive`/`unarchive`), transforms, and query helpers.
    - `test/application.validation.test.js`: 20 unit tests covering Joi validation schemas, default assignment, rejection rules, ObjectId pattern verification, and pagination parameter bounds.
  - Updated `ROADMAP.md` marking Day 8 completed.

---

## [Day 7] - 2026-10-07

### Added
- **Project 01 (Job Application Tracker)**:
  - Implemented Authentication middleware (`authenticate` / `protect` in `src/middleware/auth.js`):
    - Bearer JWT token extraction from `Authorization` HTTP header.
    - Signature, expiration, and malformed structure verification using `verifyToken`.
    - User document retrieval by decoded ID from MongoDB.
    - Deactivated user account check (`isActive`).
    - Attachment of authenticated `req.user`, `req.token`, and `req.auth` context to Express request.
  - Implemented Role-Based Authorization middleware generator (`authorize` / `restrictTo` in `src/middleware/auth.js`):
    - Validates user role against allowed roles (`admin`, `user`).
    - Throws structured `403 Forbidden` error on unauthorized access attempts.
  - Implemented Optional Authentication middleware (`optionalAuth` in `src/middleware/auth.js`):
    - Gracefully populates `req.user` if valid Bearer token exists without rejecting unauthenticated requests.
  - Added current user profile controller (`getMe` in `src/controllers/auth.controller.js`) returning safe user object.
  - Added protected route `GET /api/v1/auth/me` with Bearer authentication in `src/routes/auth.routes.js`.
  - Updated root welcome route in `src/app.js` with `authMe` endpoint metadata.
  - Added comprehensive automated test suites:
    - `test/auth.middleware.test.js`: 19 unit tests covering missing headers, malformed Bearer schemes, expired/invalid tokens, missing payloads, deleted users, deactivated accounts, valid authentication flow, role-based authorization, and optional authentication.
    - `test/auth.me.test.js`: 5 integration tests covering 200 OK profile retrieval, 401 Unauthorized missing/invalid token handling, deleted user token handling, and 403 Forbidden deactivated account handling.
  - Updated project documentation in `projects/01-job-application-tracker/README.md` and marked Day 7 complete in `ROADMAP.md`.

---

## [Day 6] - 2026-10-06

### Added
- **Project 01 (Job Application Tracker)**:
  - Installed `jsonwebtoken` for secure JWT generation, verification, and decoding.
  - Implemented JWT token utility (`src/utils/token.js`) with `generateToken`, `verifyToken` (with specific handling for token expiration and malformed signatures), and `decodeToken`.
  - Added `generateAuthToken` instance method to User model (`src/models/user.model.js`) to generate signed authentication tokens with user claims (`id`, `email`, `role`).
  - Added `ApiResponse.ok(res, data, message)` helper to `src/utils/apiResponse.js`.
  - Implemented login validation schema (`loginSchema` in `src/validations/auth.validation.js`) enforcing valid email format/normalization and password presence.
  - Implemented user login controller (`login` in `src/controllers/auth.controller.js`) with:
    - User lookup by email with explicit password selection (`.select('+password')`).
    - Timing-safe bcrypt password comparison (`user.comparePassword`).
    - Account deactivation check (`isActive`).
    - JWT auth token generation and Bearer token response.
    - Automated `lastLogin` timestamp update upon authentication.
  - Added `POST /api/v1/auth/login` route in `src/routes/auth.routes.js`.
  - Added automated test suites:
    - `test/token.test.js`: Verified JWT generation, valid payload verification, expiration error handling, invalid signature detection, decoding, and User model token generation.
    - `test/auth.login.test.js`: Verified 200 OK login flow with token creation and `lastLogin` tracking, 401 Unauthorized for non-existent users and bad passwords, 403 Forbidden for deactivated accounts, and 400 Bad Request for validation errors.
    - Updated `test/auth.validation.test.js` to cover login schema validations.
    - Updated `test/user.model.test.js` to verify `generateAuthToken` method.
    - Updated `test/utils.test.js` to verify `ApiResponse.ok`.

---

## [Day 5] - 2026-10-05

### Added
- **Project 01 (Job Application Tracker)**:
  - Installed `joi` (v18.2.9) for schema-based HTTP request validation.
  - Implemented async handler utility (`src/utils/asyncHandler.js`) for clean error propagation in controllers without verbose try-catch blocks.
  - Implemented reusable Joi request validation middleware (`src/middleware/validate.js`) supporting request `body`, `query`, and `params` with automatic field error extraction and stripping of unknown properties.
  - Created authentication validation schemas (`src/validations/auth.validation.js`) enforcing name length (2-50), valid email format/normalization, password length (min 6), and role constraints.
  - Implemented authentication controller (`src/controllers/auth.controller.js`) with `register` method featuring duplicate email verification using `User.isEmailTaken`, bcrypt hashing on save, and safe user payload formatting.
  - Implemented auth routing (`src/routes/auth.routes.js`) exposing `POST /api/v1/auth/register` and mounted on Express application (`src/app.js`).
  - Added comprehensive automated test suites:
    - `test/asyncHandler.test.js`: Verified successful handler execution and rejected promise error passing.
    - `test/validate.middleware.test.js`: Verified valid schema pass-through, 400 Bad Request error generation, unknown field stripping, and query/params validation.
    - `test/auth.validation.test.js`: Verified field length limits, email normalization, password constraints, and role defaults.
    - `test/auth.register.test.js`: Verified end-to-end user registration (201 Created), duplicate email conflict prevention (409 Conflict), and validation rejection (400 Bad Request).

---

## [Day 4] - 2026-10-04

### Added
- **Project 01 (Job Application Tracker)**:
  - Installed `bcryptjs` (v3.0.3) for cross-platform secure password hashing.
  - Implemented User Schema & Model (`src/models/user.model.js`) with comprehensive schema validation for `name`, `email`, `password`, `role`, `isActive`, and `lastLogin`.
  - Configured pre-save Mongoose middleware for automatic bcrypt salt generation and password hashing on creation and modification.
  - Added security protection with `select: false` on `password` field by default.
  - Added instance method `comparePassword(candidatePassword)` verifying candidate plaintext against stored bcrypt hashes.
  - Added instance method `toSafeObject()` and configured `toJSON` / `toObject` transform hooks to sanitize document serialization (stripping `password` and `__v`).
  - Added static query helpers `findByEmail(email)` and `isEmailTaken(email, excludeUserId)`.
  - Created automated User Model unit test suite (`test/user.model.test.js`) verifying field validation, default attributes, password comparison, schema transforms, and helper methods.

---

## [Day 3] - 2026-10-03

### Added
- **Project 01 (Job Application Tracker)**:
  - Installed `mongoose` (v9.10.4) for Object Document Mapping (ODM).
  - Implemented database connection manager (`src/config/db.js`) featuring configurable automated retry logic with exponential backoff.
  - Configured full suite of Mongoose lifecycle event listeners (`connected`, `open`, `error`, `disconnected`, `reconnected`).
  - Added connection state diagnostic utility (`getConnectionState()`) mapping Mongoose ready states.
  - Implemented clean connection termination function (`disconnectDB()`) for graceful shutdown and test isolation.
  - Integrated database connection into Express server bootstrap and graceful shutdown lifecycle (`src/index.js`).
  - Extended `/health` and `/api/v1/health` endpoints to report real-time database connection diagnostics (`src/controllers/health.controller.js`).
  - Created automated database unit test suite (`test/db.test.js`) verifying state inspection, retry mechanisms, and event listeners.
  - Updated application health test suite (`test/app.test.js`) verifying database telemetry in health responses.

---

## [Day 2] - 2026-10-02

### Added
- **Project 01 (Job Application Tracker)**:
  - Created Express application architecture (`src/app.js`) with request body parsers and dev logging.
  - Implemented health check routes & controller (`src/routes/health.routes.js`, `src/controllers/health.controller.js`) returning service status, uptime, and memory usage.
  - Built standardized REST API response utility (`src/utils/apiResponse.js`).
  - Built centralized custom error class (`src/utils/apiError.js`).
  - Added 404 fallback handler (`src/middleware/notFound.js`) and centralized global error handler (`src/middleware/errorHandler.js`).
  - Enhanced server bootstrap (`src/index.js`) with graceful shutdown for `SIGINT`, `SIGTERM`, `uncaughtException`, and `unhandledRejection`.
  - Added comprehensive automated test suites (`test/app.test.js`, `test/utils.test.js`) verifying HTTP endpoints and error handling.

---

## [Day 1] - 2026-10-01

### Added
- **Repository Setup**: Initialized root `.gitignore`, root `package.json` for multi-project orchestration, and repository documentation.
- **Project 01 (Job Application Tracker)**:
  - Created directory layout (`projects/01-job-application-tracker/src/config/`).
  - Configured `package.json` with Express, dotenv, nodemon scripts.
  - Added `.env.example` defining PORT, NODE_ENV, MONGO_URI, and JWT secret variables.
  - Implemented immutable environment configuration loader (`src/config/env.js`).
  - Added bootstrap verification entry point (`src/index.js`).
  - Created automated configuration unit test suite (`test/config.test.js`).


