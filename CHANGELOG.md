# Changelog

All notable changes across all backend projects in this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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


