# Changelog

All notable changes across all backend projects in this repository will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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

