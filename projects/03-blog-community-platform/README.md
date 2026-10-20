# Project 03: Blog & Community Platform API

A robust, enterprise-grade RESTful API for a modern blogging and community platform. Built with Node.js, Express, MongoDB, and Mongoose, this project emphasizes Role-Based Access Control (RBAC), recursive nested comments, SEO-optimized slug generation, full-text search indexing with score weighting, and API rate limiting.

---

## 📌 Focus Concepts & Features

- **Role-Based Access Control (RBAC)**: Multi-tier permission hierarchy (`user`, `author`, `moderator`, `admin`) protecting publishing workflows and administrative operations.
- **Article & Publishing Engine**:
  - Publication lifecycle management (`draft`, `published`, `archived`, `flagged`).
  - Automated collision-resistant SEO slug generation.
  - Estimated reading time computation and markdown support.
  - Tagging and category classification.
- **Nested & Threaded Comments**: Hierarchical parent-child comment tree supporting infinite or bounded reply depth, soft deletions, and author attribution.
- **Full-Text Search Engine**: MongoDB compound text indexes across article titles, content body, and tags with relevance scoring and text ranking.
- **Rate Limiting & Abuse Prevention**: Sliding window / token bucket rate limiting middleware to prevent brute-force attacks and comment spam.
- **Community Engagement**: Reaction system (likes, claps, bookmarks) and read view tracking.

---

## 🏗️ Folder Structure

```
projects/03-blog-community-platform/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── src/
│   ├── config/         # Environment configuration & resilient MongoDB connection
│   ├── controllers/    # Route controllers (health, auth, articles, comments, categories, tags)
│   ├── middleware/     # Auth, RBAC, Rate Limiter, validation, 404, error handler
│   ├── models/         # Mongoose models & schemas (User, Article, Comment, Category, Tag)
│   ├── routes/         # Express routing tables
│   ├── utils/          # ApiResponse, ApiError, asyncHandler, slugify utility
│   ├── app.js          # Express application setup
│   └── index.js        # Server bootstrap & graceful shutdown listeners
└── test/               # Automated unit & integration tests using Node.js native test runner
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
   # Development mode with nodemon
   npm run dev

   # Production mode
   npm start
   ```

4. **Run Automated Test Suite**:
   ```bash
   npm test
   ```

---

## 📡 Base Endpoints (Day 25 Initialization)

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API Directory & Welcome Payload | Public |
| `GET` | `/health` | Health Check & System Telemetry | Public |
| `GET` | `/api/v1/health` | API v1 Diagnostic Health State | Public |

---

## 📅 Development Roadmap (Days 25–36)

- [x] **Day 25**: Project workspace initialization, package.json, environment config, Express server, health check, MongoDB connection & database architecture
- [ ] **Day 26**: User & Author models with RBAC (`user`, `author`, `moderator`, `admin`), bcrypt hashing & profile management
- [ ] **Day 27**: Authentication & RBAC middleware (JWT verification, role hierarchy, permission guards)
- [ ] **Day 28**: Tag & Category schemas with administrative taxonomies & indexing
- [ ] **Day 29**: Article schema with SEO slugs, auto-slugify, reading time computation & status workflows
- [ ] **Day 30**: Article CRUD APIs with author ownership verification & status transitions
- [ ] **Day 31**: Full-Text Search pipeline with MongoDB text indexing, search score weights & multi-facet filters
- [ ] **Day 32**: Nested Comment schema with parent-child tree structure, depth limits & moderation flags
- [ ] **Day 33**: Comment CRUD & recursive thread retrieval endpoints
- [ ] **Day 34**: Community engagement (reactions, likes, bookmarks, view metrics)
- [ ] **Day 35**: Sliding-window Rate Limiting middleware & moderation enforcement APIs
- [ ] **Day 36**: Comprehensive test suites, performance optimization & full documentation
