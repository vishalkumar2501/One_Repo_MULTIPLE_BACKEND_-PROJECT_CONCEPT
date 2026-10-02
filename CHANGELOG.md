# Changelog

All notable changes across all backend projects in this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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


