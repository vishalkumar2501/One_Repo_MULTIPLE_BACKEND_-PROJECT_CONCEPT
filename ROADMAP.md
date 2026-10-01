# Backend Projects & Concepts - Master Roadmap

A multi-project repository demonstrating backend architectures, clean code principles, REST API designs, and enterprise patterns using Node.js, Express.js, MongoDB, and Mongoose.

---

## Roadmap Overview

| Project # | Project Name | Focus Concepts | Days | Status |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Job Application Tracker API** | CRUD, Express, MongoDB, Mongoose, JWT, Auth Middleware, Joi Validation, Pagination, Filtering, Search | Days 1–12 | `Planned` |
| **02** | **Expense & Budget Tracker API** | Aggregation Pipelines, Category Analytics, Date-range Filtering, Monthly Limits, Export Concepts | Days 13–24 | `Planned` |
| **03** | **Blog & Community Platform API** | Role-Based Access Control (RBAC), Nested Comments, Slugs, Full-Text Search, Rate Limiting | Days 25–36 | `Planned` |
| **04** | **Product Inventory & Order API** | Inventory Management, SKU Tracking, Mongoose Transactions (ACID), Order State Machine, Low-stock alerts | Days 37–48 | `Planned` |
| **05** | **URL Shortener & Analytics API** | Base62 encoding, Click stream tracking, Referrer/Device metrics, In-memory/Redis caching, TTL links | Days 49–58 | `Planned` |
| **06** | **Event Management & Booking API** | Ticket tiers, Atomic reservation, Concurrency management, QR Ticket Generation, Email dispatch | Days 59–70 | `Planned` |
| **07** | **Asset Management API** | Equipment & License tracking, Employee assignment, Depreciation computation, Audit logging | Days 71–80 | `Planned` |
| **08** | **Recruiter Email & Pipeline API** | Candidate stages, Templated mail triggers, Webhook listener, Async job queues, Resilient error handling | Days 81–90 | `Planned` |

---

## Detailed Daily Breakdown

### Project 1: Job Application Tracker API (Days 1–12)
- [ ] **Day 1**: Project workspace structure, root & project package.json, base configuration, `.gitignore`, `.env.example`
- [ ] **Day 2**: Express server setup, environment config, graceful shutdown, health check endpoint
- [ ] **Day 3**: MongoDB connection with Mongoose, connection retry logic, database event listeners
- [ ] **Day 4**: User Schema & Model with bcrypt password hashing and instance methods
- [ ] **Day 5**: User Registration API with input validation (Joi/Zod) and duplicate checking
- [ ] **Day 6**: User Login API with JWT token generation and credential verification
- [ ] **Day 7**: Authentication & Authorization middleware (JWT verification, payload extraction, error handling)
- [ ] **Day 8**: Job Application Model & Schema with status enums, dates, company details, and user association
- [ ] **Day 9**: Job Application CRUD Controllers & Routes (Create, Read One, Read All with User Isolation)
- [ ] **Day 10**: Job Application Update & Delete with ownership security checks
- [ ] **Day 11**: Advanced Querying: Filtering by status/job type, Search by title/company, Pagination & Sorting
- [ ] **Day 12**: Application Analytics (status breakdown, count aggregations), comprehensive testing & documentation

---

*Roadmap will be dynamically updated as each development day is completed.*
