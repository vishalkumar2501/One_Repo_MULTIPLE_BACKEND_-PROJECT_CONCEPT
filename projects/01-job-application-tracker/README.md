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

---

## 📡 API Endpoints

### System & Diagnostics
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API welcome payload and available endpoints | None |
| `GET` | `/api/v1/health` | Service and database connection telemetry | None |

### Authentication
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user account with Joi input validation | None |

#### Example: Register User (`POST /api/v1/auth/register`)

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "SecurePassword123",
  "role": "user"
}
```

**Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6650a2b8e3f41234567890ab",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": null,
      "createdAt": "2026-10-05T06:30:00.000Z",
      "updatedAt": "2026-10-05T06:30:00.000Z"
    }
  }
}
```

---

## 📅 Roadmap for Project 01

- [x] **Day 1**: Project structure initialization, environment loader, base configuration.
- [x] **Day 2**: Express server setup, graceful shutdown, health check endpoint.
- [x] **Day 3**: MongoDB connection with Mongoose, connection retry logic & event listeners.
- [x] **Day 4**: User Schema & Model with password hashing.
- [x] **Day 5**: User Registration API with validation.
- [ ] **Day 6**: User Login API with JWT token generation.
- [ ] **Day 7**: JWT Authentication & Authorization middleware.
- [ ] **Day 8**: Job Application Schema & Model.
- [ ] **Day 9**: Job Application CRUD (Create & Read).
- [ ] **Day 10**: Job Application CRUD (Update & Delete with ownership security).
- [ ] **Day 11**: Search, Filtering, Pagination & Sorting.
- [ ] **Day 12**: Analytics endpoints, test suites & API documentation.
