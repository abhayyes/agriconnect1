# AgriConnect Backend

Backend service for AgriConnect — a digital marketplace connecting farmers/FPOs directly with consumers and bulk buyers.

## Stack

- **Runtime:** Node.js + Express
- **Database:** PostgreSQL
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **AI Integration:** External HTTP service for route optimization and demand forecasting

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── db.js              # PostgreSQL connection pool
│   ├── controllers/
│   │   ├── authController.js   # User registration, login, /me
│   │   ├── listingsController.js # CRUD for listings, price history
│   │   └── ordersController.js   # CRUD for orders, AI integration
│   ├── db/
│   │   ├── migrations/
│   │   │   └── 001_init.sql    # Initial schema
│   │   ├── migrate.js          # Migration runner
│   │   └── schema.sql          # Complete schema reference
│   ├── middleware/
│   │   ├── auth.js             # JWT authentication (requireAuth)
│   │   └── authorize.js        # Role & ownership checks
│   ├── routes/
│   │   ├── health.js           # GET /health
│   │   ├── users.js            # /api/users/* (auth endpoints)
│   │   ├── listings.js         # /api/listings/*
│   │   └── orders.js           # /api/orders/*
│   └── server.js               # Express app entry point
├── .env.example
└── package.json
```

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Required environment variables:

```env
PORT=8080
DATABASE_URL=postgres://user:password@host:5432/agriconnect
JWT_SECRET=<long-random-secret-for-production>
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://localhost:5000
```

**Important:** 
- Use a strong random `JWT_SECRET` in production (not `changeme`)
- `DATABASE_URL` should point to your hosted Postgres (Supabase/Neon/Railway)
- `AI_SERVICE_URL` should point to the AI service once deployed

### 3. Run database migrations

```bash
npm run migrate
```

This creates:
- `users` table (farmer, fpo, consumer, bulk_buyer roles)
- `listings` table (crop listings with status: active/sold_out/inactive)
- `price_history` table (tracks price changes over time)
- `orders` table (with status: pending → confirmed → shipped → delivered, or cancelled)

### 4. Start the server

**Development (with auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server runs on `http://localhost:8080` (or the `PORT` you set).

## API Endpoints

### Health Check
- `GET /health` — returns `{ status: "ok", timestamp: "..." }`

### Authentication (`/api/users`)
- `POST /api/users/register` — create account (returns `{ user, token }`)
- `POST /api/users/login` — login (returns `{ user, token }`)
- `GET /api/users/me` — get current user (requires `Authorization: Bearer <token>`)

### Listings (`/api/listings`)
- `GET /api/listings` — list all listings (public, supports filters: `crop`, `status`, `location`, pagination: `page`, `limit`)
- `POST /api/listings` — create listing (auth: `farmer`/`fpo` only)
- `PATCH /api/listings/:id` — update listing (auth: owner only)
- `GET /api/listings/:crop/price-history` — get price history for a crop (public, query: `days`, `limit`)

### Orders (`/api/orders`)
- `GET /api/orders` — list user's orders (buyers see their orders, sellers see orders on their listings)
- `POST /api/orders` — create order (auth: `consumer`/`bulk_buyer` only)
- `GET /api/orders/:orderId` — get single order detail
- `PATCH /api/orders/:orderId` — update order quantity (buyer only, pending only)
- `PATCH /api/orders/:orderId/status` — update order status (seller can confirm/ship/deliver, buyer can cancel)
- `GET /api/orders/dashboard/demand-forecast` — get AI demand forecast (auth: `farmer`/`fpo` only)

## Authorization Rules

### Roles
- **farmer / fpo**: Can create and manage listings, view orders on their listings
- **consumer / bulk_buyer**: Can browse listings and place orders
- All roles can view their own profile via `/api/users/me`

### Ownership Checks
- Only the listing owner (farmer/fpo) can update/patch their listing
- Only the order buyer can update order quantity (and only when status is `pending`)
- Order status transitions:
  - Seller can: `pending → confirmed → shipped → delivered`
  - Buyer can: cancel at any stage (except `delivered`)

### Status Transitions
Valid order status flow:
```
pending → confirmed → shipped → delivered
   ↓         ↓          ↓
cancelled  cancelled  cancelled
```

## AI Service Integration

### Route Optimization
When an order transitions to `confirmed` status, the backend calls:
```
POST {AI_SERVICE_URL}/optimize-route
Body: { orderId, pickup, delivery, quantity }
```
The response is stored in `orders.route` (JSONB field).

**Failure handling:** If the AI service is unavailable, the order still confirms (route remains `null`). This prevents AI downtime from blocking transactions.

### Demand Forecasting
Farmers/FPOs can request demand predictions via:
```
GET /api/orders/dashboard/demand-forecast
```
This calls:
```
POST {AI_SERVICE_URL}/predict-demand
Body: { farmerId }
```

## Database Schema Summary

### users
- `id` (UUID, PK), `name`, `email` (unique), `password_hash`, `role` (enum), `phone`, `location`
- Roles: `farmer`, `fpo`, `consumer`, `bulk_buyer`

### listings
- `id` (UUID, PK), `farmer_id` (FK → users), `crop`, `variety`, `quantity`, `unit`, `price_per_unit`, `status` (enum), `location`
- Status: `active`, `sold_out`, `inactive`

### price_history
- `id` (UUID, PK), `crop`, `listing_id` (FK → listings), `price`, `unit`, `recorded_at`
- Auto-populated when listing price changes

### orders
- `id` (UUID, PK), `buyer_id` (FK → users), `listing_id` (FK → listings), `quantity`, `total_price`, `status` (enum), `route` (JSONB)
- Status: `pending`, `confirmed`, `shipped`, `delivered`, `cancelled`

## Security Features

- **JWT tokens:** 7-day expiry (configurable via `JWT_EXPIRES_IN`)
- **Password hashing:** bcrypt with 10 salt rounds
- **Email normalization:** lowercase on registration/login to prevent duplicates
- **Role-based access control:** `requireRole` middleware
- **Ownership checks:** users can only modify their own resources
- **Generic error messages:** "Invalid credentials" on login (no user enumeration)

## Known Limitations (Hackathon Scope)

- **No token revocation:** JWTs are stateless, logout is client-side only (tokens remain valid until expiry)
- **No rate limiting:** Recommended to add `express-rate-limit` on `/register` and `/login` endpoints
- **No refresh tokens:** Token rotation not implemented
- **AI service failures are non-blocking:** Route optimization failure does not prevent order confirmation

## Development Notes

### Testing Auth Flow
1. Register: `POST /api/users/register` with `{ name, email, password, role }`
2. Copy the returned `token`
3. Use in headers: `Authorization: Bearer <token>`
4. Test protected routes: `GET /api/users/me`

### Testing Listings Flow
1. Login as `farmer` role
2. Create listing: `POST /api/listings` with crop details
3. View listings: `GET /api/listings?crop=wheat`
4. Update listing: `PATCH /api/listings/:id`

### Testing Orders Flow
1. Login as `consumer` role
2. Create order: `POST /api/orders` with `listing_id` and `quantity`
3. Login as the seller (farmer who owns the listing)
4. Confirm order: `PATCH /api/orders/:orderId/status` with `{ "status": "confirmed" }`
5. Check that `route` field is populated (if AI service is running)

## Troubleshooting

**Migration fails with "relation already exists":**
- Drop the database and recreate it, or manually drop conflicting tables
- Check that `DATABASE_URL` points to the correct database

**JWT verification fails:**
- Ensure `JWT_SECRET` in `.env` matches between server restarts
- Check that the token hasn't expired (default 7d)
- Verify `Authorization: Bearer <token>` header format

**AI service integration fails:**
- Check `AI_SERVICE_URL` is set correctly in `.env`
- Orders will still confirm even if AI service is down (route stays `null`)
- Check server logs for AI service errors

## Production Deployment Checklist

- [ ] Set strong random `JWT_SECRET`
- [ ] Use hosted Postgres (Supabase/Neon/Railway)
- [ ] Enable HTTPS/TLS
- [ ] Add rate limiting on auth endpoints
- [ ] Set up monitoring/logging
- [ ] Configure CORS for frontend domain only
- [ ] Add health check monitoring
- [ ] Set reasonable `JWT_EXPIRES_IN` (7d is fine for demo)

## Team

- **Backend:** Amrit (schema, auth) + Anchal (listings, orders, AI integration)
- **Frontend:** Abhay
- **AI/Logistics:** Harsh + Akhil

---

Built for AgriConnect Hackathon — Deadline: 13 September 2025
