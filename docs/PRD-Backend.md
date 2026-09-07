# Product Requirements Document — AgriConnect Backend

**Version:** 1.0  
**Date:** 6 September 2026  
**Author:** Abhay Singh (Backend Lead, joint work with Anchal)  
**Hackathon:** Smart India Hackathon 2026 — Problem Statement SIH 26033  
**Deadline:** 13 September 2026  
**Status:** Draft  

---

## 1. Executive Summary

AgriConnect is a digital marketplace connecting farmers and Farmer Producer Organizations (FPOs) directly with consumers and bulk buyers. The backend serves as the core API layer powering user authentication, product listing management, order processing, and integration with an external AI service for demand forecasting and route optimization.

This document defines the complete backend deliverables, data models, API contracts, authentication strategy, deployment requirements, and acceptance criteria for the hackathon submission.

---

## 2. Project Context

| Field | Detail |
|---|---|
| Problem | Farmers receive ~30-40% of the final consumer price due to middlemen. Consumers pay inflated prices. Cold chain inefficiencies cause 30%+ post-harvest losses. |
| Solution | Direct farmer-to-consumer marketplace with AI-powered logistics and demand prediction. |
| Target Users | Farmers/FPOs (sellers), Retail consumers (buyers), Wholesale/Bulk buyers (B2B buyers) |
| Key Value Proposition | Zero middleman commission, fair MSP-linked pricing, same-day delivery via route optimization |

---

## 3. Team & Ownership

| Member | Role | Backend Ownership |
|---|---|---|
| Abhay Singh | Frontend (solo) | API consumer — integration testing |
| Anchal | Backend (joint) | `/api/listings` (all routes), `/api/orders` (all routes), AI service integration wiring |
| Amrit | Backend (joint) | DB schema + migrations, `/api/users` (register/login/me, JWT auth), `/health` endpoint |
| Harsh + Akhil | AI / Logistics Service | Demand forecasting (`/predict-demand`), Route optimization (`/optimize-route`) |

---

## 4. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js (LTS) | Fast prototyping, shared JS stack with frontend |
| Framework | Express.js | Lightweight, well-understood, fast to build REST APIs |
| Database | PostgreSQL | Relational data with UUIDs, JSONB for route data, strong ACID guarantees |
| Auth | JWT (HS256, 7-day expiry) | Stateless auth, easy integration with React frontend |
| Password Hashing | bcrypt (10 salt rounds) | Industry standard, adequate security for hackathon |
| ORM / Query | Raw `pg` pool (no ORM) | Full SQL control, no abstraction overhead, matches api-contracts.md exactly |
| Deployment | Railway / Neon / Supabase (free tier) | Zero-config hosted PostgreSQL, avoids local setup pain |
| Environment | `.env` with `dotenv` | Standard Node.js env management |

---

## 5. Repository Structure

```
agriconnect/
├── frontend/          ← Abhay (solo frontend)
├── backend/           ← Amrit + Anchal
│   ├── src/
│   │   ├── server.js            # Express app entry point
│   │   ├── config/
│   │   │   └── db.js            # PostgreSQL connection pool
│   │   ├── controllers/
│   │   │   ├── authController.js    # Register, Login, Me
│   │   │   ├── listingsController.js # CRUD for listings + price history
│   │   │   └── ordersController.js   # CRUD for orders + AI integration
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT verification (requireAuth)
│   │   │   └── authorize.js     # Role-based + ownership guards
│   │   ├── routes/
│   │   │   ├── health.js        # GET /health
│   │   │   ├── users.js         # /api/users/*
│   │   │   ├── listings.js      # /api/listings/*
│   │   │   └── orders.js        # /api/orders/*
│   │   └── db/
│   │       ├── schema.sql       # Full schema (reference)
│   │       └── migrations/
│   │           └── 001_init.sql # Initial migration
│   ├── .env
│   ├── .env.example
│   └── package.json
├── ai-service/        ← Harsh + Akhil
├── docs/
│   ├── api-contracts.md      # Locked API contract (source of truth)
│   ├── PRD-Backend.md        # This document
│   └── ...
└── .gitignore
```

---

## 6. Database Schema Design

### 6.1 Entity Relationship Diagram (Logical)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│    users     │       │     listings     │       │    orders    │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (UUID PK) │◄──┐   │ id (UUID PK)     │◄──┐   │ id (UUID PK) │
│ name         │   │   │ farmer_id (FK)   │───┘   │ buyer_id(FK) │──┐
│ email (UNQ)  │   │   │ crop             │       │ listing_id   │──┘
│ password_hash│   │   │ variety          │       │ quantity     │
│ role (ENUM)  │   │   │ quantity         │       │ total_price  │
│ phone        │   │   │ unit             │       │ status(ENUM) │
│ location     │   │   │ price_per_unit   │       │ route (JSONB)│
│ created_at   │   │   │ status (ENUM)    │       │ created_at   │
│ updated_at   │   │   │ location         │       │ updated_at   │
└──────────────┘   │   │ created_at       │       └──────────────┘
                   │   │ updated_at       │
                   │   └──────────────────┘
                   │
                   │   ┌──────────────────┐
                   │   │  price_history   │
                   │   ├──────────────────┤
                   └───│ id (UUID PK)     │
                       │ crop             │
                       │ listing_id (FK)  │
                       │ price            │
                       │ unit             │
                       │ recorded_at      │
                       └──────────────────┘
```

### 6.2 Enums

| Enum Name | Values | Used In |
|---|---|---|
| `user_role` | `farmer`, `fpo`, `consumer`, `bulk_buyer` | `users.role` |
| `listing_status` | `active`, `sold_out`, `inactive` | `listings.status` |
| `order_status` | `pending`, `confirmed`, `shipped`, `delivered`, `cancelled` | `orders.status` |

### 6.3 Table: `users`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | |
| `name` | VARCHAR(120) | NOT NULL | Full name or FPO name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Normalized to lowercase on write |
| `password_hash` | TEXT | NOT NULL | bcrypt hash |
| `role` | user_role | NOT NULL | One of the 4 enum values |
| `phone` | VARCHAR(20) | NULLABLE | 10-digit Indian mobile |
| `location` | VARCHAR(255) | NULLABLE | "District, State" format |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | Auto-updated via trigger |

**Indexes:** `idx_users_email` (email), `idx_users_role` (role)

### 6.4 Table: `listings`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | |
| `farmer_id` | UUID | NOT NULL, FK → users(id) ON DELETE CASCADE | |
| `crop` | VARCHAR(100) | NOT NULL | e.g. "Tomatoes", "Basmati Rice" |
| `variety` | VARCHAR(100) | NULLABLE | e.g. "Sharbati", "Red Round" |
| `quantity` | NUMERIC(12,2) | NOT NULL, CHECK (≥ 0) | Available stock in listing unit |
| `unit` | VARCHAR(20) | NOT NULL | e.g. "kg", "quintal", "dozen" |
| `price_per_unit` | NUMERIC(12,2) | NOT NULL, CHECK (≥ 0) | Direct farm price in INR |
| `status` | listing_status | NOT NULL, DEFAULT 'active' | |
| `location` | VARCHAR(255) | NULLABLE | Farm / pickup location |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | Auto-updated via trigger |

**Indexes:** `idx_listings_crop` (crop), `idx_listings_farmer_id` (farmer_id), `idx_listings_status` (status)

### 6.5 Table: `price_history`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | |
| `crop` | VARCHAR(100) | NOT NULL | Denormalized for fast queries |
| `listing_id` | UUID | FK → listings(id) ON DELETE SET NULL | |
| `price` | NUMERIC(12,2) | NOT NULL | |
| `unit` | VARCHAR(20) | NOT NULL | |
| `recorded_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | |

**Index:** `idx_price_history_crop_time` (crop, recorded_at)

### 6.6 Table: `orders`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | UUID | PRIMARY KEY, DEFAULT `gen_random_uuid()` | |
| `buyer_id` | UUID | NOT NULL, FK → users(id) ON DELETE RESTRICT | |
| `listing_id` | UUID | NOT NULL, FK → listings(id) ON DELETE RESTRICT | |
| `quantity` | NUMERIC(12,2) | NOT NULL, CHECK (> 0) | |
| `total_price` | NUMERIC(12,2) | NOT NULL, CHECK (≥ 0) | Calculated: quantity × price_per_unit |
| `status` | order_status | NOT NULL, DEFAULT 'pending' | |
| `route` | JSONB | NULLABLE | AI service route optimization result |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT `now()` | Auto-updated via trigger |

**Indexes:** `idx_orders_buyer_id` (buyer_id), `idx_orders_listing_id` (listing_id), `idx_orders_status` (status)

### 6.7 Triggers

A shared `set_updated_at()` trigger function auto-sets `updated_at = now()` on every UPDATE for `users`, `listings`, and `orders`.

---

## 7. API Endpoints

> **Source of truth:** `docs/api-contracts.md` (locked, merged to main). This section is a summary; the contract file defines exact JSON shapes.

### 7.1 Health

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Returns `{ status: "ok", timestamp, uptime }` |

### 7.2 Authentication (`/api/users`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/users/register` | No | Create account. Returns `{ user, token }` |
| `POST` | `/api/users/login` | No | Login. Returns `{ user, token }` |
| `GET` | `/api/users/me` | Bearer JWT | Get current user profile |

**Registration body:** `{ name, email, password, role, phone?, location? }`  
**Login body:** `{ email, password }`  
**Response:** `{ user: { id, name, email, role, phone, location, created_at }, token }`

### 7.3 Listings (`/api/listings`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/listings` | No | List active listings (filterable by crop, location) |
| `POST` | `/api/listings` | Bearer JWT (farmer/fpo) | Create a new listing |
| `PATCH` | `/api/listings/:id` | Bearer JWT (owner) | Update listing (price, quantity, status) |
| `GET` | `/api/listings/:crop/price-history` | No | Get historical prices for a crop |

### 7.4 Orders (`/api/orders`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/orders` | Bearer JWT | Get orders (buyer sees own, farmer sees orders on their listings) |
| `POST` | `/api/orders` | Bearer JWT (consumer/bulk_buyer) | Place a new order |
| `GET` | `/api/orders/:orderId` | Bearer JWT (participant) | Get single order details |
| `PATCH` | `/api/orders/:orderId` | Bearer JWT (buyer, pending only) | Update order quantity |
| `PATCH` | `/api/orders/:orderId/status` | Bearer JWT (participant) | Advance order status |

**Status transitions:**
```
pending → confirmed → shipped → delivered
pending → cancelled
confirmed → cancelled
shipped → cancelled
delivered → (terminal)
cancelled → (terminal)
```

**Authorization rules for status update:**
- Seller (farmer/FPO) can: confirm, ship, deliver
- Buyer can: cancel

---

## 8. Authentication & Authorization

### 8.1 JWT Strategy

| Parameter | Value |
|---|---|
| Algorithm | HS256 |
| Secret | `JWT_SECRET` from `.env` |
| Expiry | 7 days (`JWT_EXPIRES_IN=7d`) |
| Payload | `{ id, role, email }` |

### 8.2 Password Hashing

| Parameter | Value |
|---|---|
| Algorithm | bcrypt |
| Salt rounds | 10 |

### 8.3 Middleware Chain

```
requireAuth  →  Verifies JWT, sets req.user = { id, role, email }
requireRole  →  Checks req.user.role against allowed roles
requireOwnership  →  Checks resource belongs to req.user.id
```

### 8.4 Role-Based Access

| Role | Can Register Listings | Can Place Orders | Can View All Orders |
|---|---|---|---|
| `farmer` | Yes (own) | No | Yes (on own listings) |
| `fpo` | Yes (own) | No | Yes (on own listings) |
| `consumer` | No | Yes | Yes (own orders) |
| `bulk_buyer` | No | Yes | Yes (own orders) |

---

## 9. AI Service Integration

### 9.1 Overview

The backend calls the AI service (Harsh + Akhil's team) server-side. The frontend never calls the AI service directly.

### 9.2 Endpoints Called

| When | AI Endpoint | Stored Where | Called By |
|---|---|---|---|
| Order confirmed | `POST {AI_SERVICE_URL}/optimize-route` | `orders.route` (JSONB) | `ordersController.js` |
| Farmer views dashboard | `POST {AI_SERVICE_URL}/predict-demand` | Returned live (not stored) | `ordersController.js` |

### 9.3 Integration Constraints

- **5-second timeout** on all AI calls (AbortSignal.timeout)
- **Graceful degradation**: If AI service is down, operations proceed without AI data
- **Error logging**: AI failures are logged to console but never block the user flow
- Route data stored as JSONB in `orders.route` for flexibility

### 9.4 AI Service Contract (Expected)

**`/optimize-route`**
```json
Request:  { orderId, pickup, delivery, quantity }
Response: { distance_km, estimated_time_min, waypoints: [...], cost }
```

**`/predict-demand`**
```json
Request:  { farmerId }
Response: { forecast: [{ crop, predicted_demand, confidence, period }] }
```

---

## 10. Environment Configuration

### 10.1 `.env.example`

```
PORT=8080
DATABASE_URL=postgres://user:password@host:port/dbname
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:5000
```

### 10.2 Required Environment Variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `PORT` | Yes | 8080 | Backend server port |
| `DATABASE_URL` | Yes | — | Full PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret for HS256 signing |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry duration |
| `AI_SERVICE_URL` | No | — | AI service base URL; integration skipped if unset |

---

## 11. Deployment & Infrastructure

### 11.1 Phase 1 — Local Development (Current)

| Component | Location |
|---|---|
| Backend | `localhost:8080` |
| PostgreSQL | Local (port 3006 or 5432) |
| Frontend | `localhost:5173` (Vite dev server) |
| AI Service | `localhost:5000` (optional, graceful degradation if down) |

### 11.2 Phase 2 — Hackathon Submission (Target)

| Component | Platform | Rationale |
|---|---|---|
| Backend | Railway / Render (free tier) | Easy Node.js deployment |
| PostgreSQL | Railway managed DB / Neon / Supabase | Zero-config hosted Postgres |
| Frontend | Vercel / Netlify | Free static hosting with CI |
| AI Service | Railway / Render | Python service deployment |

### 11.3 CORS Configuration

The backend must allow requests from:
- `http://localhost:5173` (local dev)
- Frontend deployment URL (production)

---

## 12. Error Handling

### 12.1 HTTP Status Codes

| Code | When |
|---|---|
| 200 | Successful read/update |
| 201 | Successful create |
| 400 | Bad request / validation error |
| 401 | Missing or invalid JWT |
| 403 | Valid JWT but insufficient role/ownership |
| 404 | Resource not found |
| 409 | Conflict (e.g. email already registered) |
| 500 | Internal server error |

### 12.2 Error Response Shape

```json
{
  "error": "Human-readable error message",
  "message": "Optional additional detail (for 403/400)"
}
```

### 12.3 Global Error Handler

Express middleware at the end of the chain catches unhandled errors and returns:
```json
{
  "error": "Internal server error"
}
```

---

## 13. Acceptance Criteria

### 13.1 Must-Have (Demo Requirements)

| # | Criterion | Validation |
|---|---|---|
| AC-1 | User can register with name, email, password, role | `POST /api/users/register` returns 201 + JWT |
| AC-2 | User can login with email + password | `POST /api/users/login` returns 200 + JWT |
| AC-3 | Authenticated user can fetch their profile | `GET /api/users/me` returns user data |
| AC-4 | Farmer can create a listing | `POST /api/listings` returns 201 |
| AC-5 | Listings are publicly browsable | `GET /api/listings` returns array |
| AC-6 | Consumer can place an order | `POST /api/orders` returns 201 |
| AC-7 | Orders are visible to both buyer and seller | `GET /api/orders` returns role-appropriate results |
| AC-8 | Order status can be progressed | `PATCH /api/orders/:id/status` follows valid transitions |
| AC-9 | Health endpoint returns server status | `GET /health` returns `{ status: "ok" }` |
| AC-10 | CORS allows frontend to call all endpoints | No CORS errors in browser console |

### 13.2 Should-Have (Bonus)

| # | Criterion | Validation |
|---|---|---|
| AC-11 | Price history is queryable per crop | `GET /api/listings/:crop/price-history` returns time series |
| AC-12 | AI route optimization fires on order confirm | `orders.route` populated when AI service is available |
| AC-13 | Demand prediction available for farmers | Dashboard endpoint returns forecast data |
| AC-14 | Pagination on listings and orders | Query params `page` and `limit` work |

---

## 14. Development Workflow

### 14.1 Git Branching Strategy

```
main (protected, PRs only)
  └── backend (shared working branch)
       ├── backend/amrit-auth    ← Amrit's sub-branch
       └── backend/anchal-listings-orders  ← Anchal's sub-branch
```

### 14.2 PR Process

1. Work on your sub-branch (`backend/amrit-auth` or `backend/anchal-listings-orders`)
2. PR into `backend` branch
3. Review each other's PRs before merge
4. `backend` → `main` via PR (hackathon submission)

### 14.3 Build Order (Dependency Chain)

| Priority | Deliverable | Blocks | Owner |
|---|---|---|---|
| P0 | DB schema + migrations | Everything | Amrit |
| P1 | `GET /health` | Other teams need endpoint for integration | Amrit |
| P2 | Auth endpoints (`/register`, `/login`, `/me`) | Abhay's login flow | Amrit |
| P2 | Listings endpoints (all) | Order creation needs listings | Anchal |
| P3 | Orders endpoints (all) | Full order lifecycle | Anchal |
| P3 | AI service integration wiring | Route optimization + demand forecast | Anchal |
| P4 | Pagination, filtering, validation polish | Demo polish | Both |

### 14.4 Schema Change Protocol

1. Both owners discuss the change in the team chat
2. Agree on the new schema
3. One person writes the migration and updates `schema.sql`
4. The other reviews the PR
5. Never edit `schema.sql` or migration files simultaneously

---

## 15. Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| PostgreSQL setup pain on local machines | Delays development | Use hosted Postgres (Neon/Supabase) as primary, local as fallback |
| AI service not ready in time | Missing route optimization + demand forecast | Graceful degradation built in — backend works without AI |
| Auth bugs blocking frontend integration | Abhay can't test login/register | Prioritize auth endpoints, test with curl before frontend integration |
| Schema changes mid-development | Merge conflicts, broken migrations | Schema change protocol (Section 14.4), design together first |
| Free tier hosting limits | Service may sleep on inactivity | Acceptable for hackathon demo; use cold start workarounds |
| Time crunch (7-day deadline) | Incomplete features | Strict priority order (Section 14.3); must-haves first |

---

## 16. Timeline

| Day | Date | Milestone |
|---|---|---|
| Day 1 | 7 Sep | Schema finalized + migration written + `/health` deployed |
| Day 2 | 8 Sep | Auth endpoints done + Abhay can integrate login |
| Day 3 | 9 Sep | Listings endpoints done + seed data |
| Day 4 | 10 Sep | Orders endpoints done + full order lifecycle |
| Day 5 | 11 Sep | AI integration wired + end-to-end testing |
| Day 6 | 12 Sep | Bug fixes, polish, deployment to hosted platform |
| Day 7 | 13 Sep | **Hackathon submission deadline** |

---

## 17. Glossary

| Term | Definition |
|---|---|
| FPO | Farmer Producer Organization — a collective of farmers that acts as a single business entity |
| MSP | Minimum Support Price — government-set minimum price for agricultural produce |
| Mandi | Traditional wholesale agricultural market in India |
| Cold Chain | Temperature-controlled supply chain from farm to consumer |
| Direct Trade | Selling directly from producer to consumer without intermediaries |

---

*This PRD is a living document. Updates should be communicated to all team members and reflected in version changes.*
