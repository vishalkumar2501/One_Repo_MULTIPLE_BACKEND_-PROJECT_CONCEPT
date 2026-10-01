# Project 01: Job Application Tracker API

A RESTful backend service allowing job seekers to manage, organize, and monitor their job application pipelines (companies, positions, salary ranges, interview stages, statuses, and notes) with isolated user accounts and secure JWT authentication.

---

## 📌 Features & Architecture

- **User Authentication**: Secure registration and login using bcrypt password hashing and JWT token issuance.
- **Job Application Management**: CRUD operations for job applications with individual user data isolation.
- **Pipeline Status Tracking**: Status tracking across stages: `APPLIED`, `INTERVIEWING`, `OFFERED`, `REJECTED`, `WITHDRAWN`.
- **Advanced Query Engine**: Full-text searching on company/position, filtering by application status and job type (Remote, Hybrid, Onsite), with robust pagination and sorting.
- **Metrics & Analytics**: Aggregation endpoint summarizing status breakdown and application velocity.

---

## 🏗️ Folder Structure

```
projects/01-job-application-tracker/
├── .env.example
├── package.json
├── README.md
└── src/
    ├── config/         # Environment and Database configuration
    ├── controllers/    # Request handlers
    ├── middleware/     # Auth, validation, and error middlewares
    ├── models/         # Mongoose schemas & models
    ├── routes/         # Express route definitions
    ├── services/       # Business logic layer
    ├── utils/          # Helper utilities & custom error classes
    ├── app.js          # Express app setup & middleware pipeline
    └── index.js        # Server bootstrap entry point
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
   # Development mode with auto-reload
   npm run dev

   # Production mode
   npm start
   ```

---

## 📅 Roadmap for Project 01

- [x] **Day 1**: Project structure initialization, environment loader, base configuration.
- [ ] **Day 2**: Express server setup, graceful shutdown, health check endpoint.
- [ ] **Day 3**: MongoDB connection with Mongoose and retry logic.
- [ ] **Day 4**: User Schema & Model with password hashing.
- [ ] **Day 5**: User Registration API with validation.
- [ ] **Day 6**: User Login API with JWT token generation.
- [ ] **Day 7**: JWT Authentication & Authorization middleware.
- [ ] **Day 8**: Job Application Schema & Model.
- [ ] **Day 9**: Job Application CRUD (Create & Read).
- [ ] **Day 10**: Job Application CRUD (Update & Delete with ownership security).
- [ ] **Day 11**: Search, Filtering, Pagination & Sorting.
- [ ] **Day 12**: Analytics endpoints, test suites & API documentation.
