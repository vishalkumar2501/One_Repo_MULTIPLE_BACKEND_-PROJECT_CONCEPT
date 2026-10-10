# Project 01: Job Application Tracker API

A RESTful backend service allowing job seekers to manage, organize, and monitor their job application pipelines (companies, positions, salary ranges, interview stages, statuses, and notes) with isolated user accounts and secure JWT authentication.

---

## 📌 Features & Architecture

- **User Authentication**: Secure registration and login using bcrypt password hashing and JWT token issuance.
- **Authentication & RBAC Middleware**: JWT Bearer token verification, payload extraction, account state checks, role-based authorization (`admin`, `user`), and optional authentication support.
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
├── src/
│   ├── config/         # Environment and Database configuration
│   ├── controllers/    # Request handlers (auth, health, applications)
│   ├── middleware/     # Auth, RBAC, Joi validation, 404 & centralized error handlers
│   ├── models/         # Mongoose schemas & models (User, Application)
│   ├── routes/         # Express route definitions
│   ├── utils/          # Token helpers, API response & custom error classes
│   ├── app.js          # Express app setup & middleware pipeline
│   └── index.js        # Server bootstrap entry point
└── test/               # Node.js built-in automated test suites
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

4. **Run Automated Tests**:
   ```bash
   npm test
   ```

---

## 📡 API Endpoints

### System & Diagnostics
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | API welcome payload and available endpoints | None |
| `GET` | `/api/v1/health` | Service and database connection telemetry | None |

### Authentication & Profile
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | Register a new user account with Joi input validation | None |
| `POST` | `/api/v1/auth/login` | Authenticate user credentials and receive JWT access token | None |
| `GET` | `/api/v1/auth/me` | Retrieve currently authenticated user profile | Bearer Token (`authenticate`) |

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

#### Example: Login User (`POST /api/v1/auth/login`)

**Request Body:**
```json
{
  "email": "jane.doe@example.com",
  "password": "SecurePassword123"
}
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User logged in successfully",
  "data": {
    "user": {
      "_id": "6650a2b8e3f41234567890ab",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-10-06T04:40:00.000Z",
      "createdAt": "2026-10-05T06:30:00.000Z",
      "updatedAt": "2026-10-06T04:40:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": "7d"
  }
}
```

#### Example: Get Current User Profile (`GET /api/v1/auth/me`)

**Request Headers:**
```http
Authorization: Bearer <your_jwt_access_token>
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User profile retrieved successfully",
  "data": {
    "user": {
      "_id": "6650a2b8e3f41234567890ab",
      "name": "Jane Doe",
      "email": "jane.doe@example.com",
      "role": "user",
      "isActive": true,
      "lastLogin": "2026-10-06T04:40:00.000Z",
      "createdAt": "2026-10-05T06:30:00.000Z",
      "updatedAt": "2026-10-06T04:40:00.000Z"
    }
  }
}
```

### Job Applications Management
| Method | Endpoint | Description | Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/applications` | Create a new job application linked to authenticated user | Bearer Token (`authenticate`) |
| `GET` | `/api/v1/applications` | List applications with pagination, sorting, and filters | Bearer Token (`authenticate`) |
| `GET` | `/api/v1/applications/:id` | Get single application by ID with strict user isolation | Bearer Token (`authenticate`) |

#### Example: Create Job Application (`POST /api/v1/applications`)

**Request Headers:**
```http
Authorization: Bearer <your_jwt_access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "company": "Stripe",
  "position": "Backend Software Engineer",
  "jobType": "full-time",
  "workLocation": "remote",
  "status": "applied",
  "priority": "high",
  "salary": {
    "min": 140000,
    "max": 180000,
    "currency": "USD",
    "period": "yearly"
  },
  "notes": "Applied via referral link on company careers portal"
}
```

**Success Response (`201 Created`):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Job application created successfully",
  "data": {
    "application": {
      "_id": "6650a2b8e3f41234567890c1",
      "user": "6650a2b8e3f41234567890ab",
      "company": "Stripe",
      "position": "Backend Software Engineer",
      "jobType": "full-time",
      "workLocation": "remote",
      "location": "",
      "status": "applied",
      "salary": {
        "min": 140000,
        "max": 180000,
        "currency": "USD",
        "period": "yearly"
      },
      "priority": "high",
      "isArchived": false,
      "interviewStages": [],
      "createdAt": "2026-10-10T06:00:00.000Z",
      "updatedAt": "2026-10-10T06:00:00.000Z"
    }
  }
}
```

#### Example: List Job Applications (`GET /api/v1/applications?status=applied&limit=10&page=1`)

**Request Headers:**
```http
Authorization: Bearer <your_jwt_access_token>
```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job applications retrieved successfully",
  "data": {
    "applications": [
      {
        "_id": "6650a2b8e3f41234567890c1",
        "company": "Stripe",
        "position": "Backend Software Engineer",
        "status": "applied",
        "workLocation": "remote",
        "priority": "high",
        "createdAt": "2026-10-10T06:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

## 🔒 Security & Middleware

- **`authenticate` / `protect`**: Enforces valid `Bearer <token>` in `Authorization` header, verifies signature & expiration, and queries active user context attaching `req.user` & `req.token`.
- **`authorize(...roles)` / `restrictTo(...roles)`**: Role-based access control checking `req.user.role` against authorized roles (e.g. `'admin'`, `'user'`), throwing `403 Forbidden` if unauthorized.
- **`optionalAuth`**: Gracefully attaches user if valid token present without rejecting unauthenticated requests.
- **`validate(schema)`**: Request schema validator powered by Joi for `body`, `query`, and `params`.
- **Multi-tenant User Isolation**: Job application records are partitioned strictly by `req.user._id`, preventing unauthorized cross-user reads or updates.

---

## 🗄️ Application Data Model & Lifecycle

The Job Application entity (`src/models/application.model.js`) is designed for multi-tenant isolation with indexes for fast retrieval:

| Field | Type | Details |
| :--- | :--- | :--- |
| `user` | `ObjectId` (Ref: `User`) | Foreign key linking application to authenticated user (`required`, indexed) |
| `company` | `String` | Company name (`required`, length: 2–100, text indexed) |
| `position` | `String` | Role title (`required`, length: 2–100, text indexed) |
| `jobType` | `String` (Enum) | `full-time`, `part-time`, `contract`, `internship`, `freelance` |
| `workLocation` | `String` (Enum) | `remote`, `hybrid`, `onsite` |
| `status` | `String` (Enum) | `applied`, `interviewing`, `offered`, `rejected`, `withdrawn` |
| `salary` | `Object` | Range (`min`, `max`), `currency` (3-char ISO code), and `period` (`yearly`, `monthly`, `hourly`) |
| `applicationDate`| `Date` | Date applied (defaults to `Date.now`) |
| `interviewStages`| `Array` | Subdocument array (`stageName`, `stageDate`, `interviewer`, `status`, `feedback`) |
| `priority` | `String` (Enum) | `low`, `medium`, `high` |
| `isArchived` | `Boolean` | Soft-archiving flag (`default: false`) |

---

## 📅 Roadmap for Project 01

- [x] **Day 1**: Project structure initialization, environment loader, base configuration.
- [x] **Day 2**: Express server setup, graceful shutdown, health check endpoint.
- [x] **Day 3**: MongoDB connection with Mongoose, connection retry logic & event listeners.
- [x] **Day 4**: User Schema & Model with password hashing.
- [x] **Day 5**: User Registration API with validation.
- [x] **Day 6**: User Login API with JWT token generation.
- [x] **Day 7**: JWT Authentication & Authorization middleware.
- [x] **Day 8**: Job Application Schema & Model.
- [x] **Day 9**: Job Application CRUD (Create & Read with User Isolation).
- [ ] **Day 10**: Job Application CRUD (Update & Delete with ownership security).
- [ ] **Day 11**: Search, Filtering, Pagination & Sorting.
- [ ] **Day 12**: Analytics endpoints, test suites & API documentation.
