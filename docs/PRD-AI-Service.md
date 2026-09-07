# Product Requirements Document — AgriConnect AI Service

| Field | Value |
|---|---|
| **Project** | AgriConnect — Smart India Hackathon 2026 (SIH 26033) |
| **Document** | PRD — AI Service (Demand Forecasting + Route Optimization) |
| **Version** | 1.0 (Draft) |
| **Status** | Not yet developed |
| **Team owners** | **Harsh + Akhil** (AI & Logistics) |
| **Integrates with** | AgriConnect Backend (PRD-Backend.md) |
| **Language** | Python (recommended: FastAPI) — *new, separate service* |
| **Deadline** | 13 September 2026 |

---

## 1. Executive Summary

AgriConnect sells farm-fresh produce direct from farmers/FPOs to consumers and bulk buyers. The **AI service** is the standalone intelligence layer that adds two capabilities the core marketplace does not provide:

1. **Route Optimization (Logistics)** — when a farmer confirms an order, decide the most efficient pickup→delivery route (distance, ETA, waypoints, cost).
2. **Demand Forecasting (Insight)** — predict short-term demand for a farmer/FPO's crops so they know what and how much to plant/reap/price next.

This is the **final component of the AgriConnect stack**. The backend already contains the calling stubs and graceful-degradation logic; this PRD defines the service the AI team must build and run at `AI_SERVICE_URL`. **No code has been written for this service yet** — this document is the agreement on what to build.

> **Note on scope & expectations:** This is a hackathon demo with limited historical data (see §6). The PRD sets realistic baselines (classical/statistical + lightweight ML) that **work on small data now**, and flags where heavier models are aspirational.

---

## 2. Project Context

- **What**: A direct farmer→consumer marketplace that removes middlemen.
- **Where it fits**: The AI service sits **server-side** behind the Express backend. The React frontend **never** calls the AI service directly — it goes through the backend APIs (`GET /api/orders/dashboard/demand-forecast`, and route data returned on confirmed orders).
- **Why now**: The core marketplace (auth, listings, orders, payments) is built and working. AI is the differentiator for the demo/semifinals.

---

## 3. Team & Ownership

| Person | Responsibility |
|---|---|
| **Harsh** | Lead — model selection & implementation, demand forecasting |
| **Akhil** | Logistics — route optimization, maps/graph data, integration |
| Backend team (Abhay/Anchal/Amrit) | Provide the calling contract; **already done** |

**Collaboration rule:** The AI team defines the service; the backend already defines the **request/response contract it will call** (§8). Keep that contract identical — do not change field names without updating `PRD-Backend.md` §9.

---

## 4. Tech Stack (Recommended)

| Concern | Choice | Why |
|---|---|---|
| Framework | **FastAPI** (Python) | Async, fast, auto OpenAPI docs, modern |
| Routing/Geo | **OpenRouteService (ORS)** or **OSRM**; fallback **Google Maps Directions** | Free/TOS-friendly for demo; key in `.env` |
| Forecasting | **Prophet** OR **statsmodels (ETS/ARIMA)** OR custom rolling-naive baseline | Small-data friendly; Prophet is robust & easy |
| Data frame/lib | **pandas / numpy** | Table handling from SQL |
| HTTP from backend | Python `fastapi` routes + `pydantic` models | Contract validation |
| Config | `.env` (`.env.example` already scaffolded) | `PORT`, `MAPS_API_KEY` |

**Optional ML (aspirational):** `scikit-learn` (regression for demand), `pulp`/`ortools` (if true optimization beyond heuristic routing is attempted).

---

## 5. Service Structure (Recommended)

```
ai-service/
├── .env.example          # exists — PORT=8000, MAPS_API_KEY=changeme
├── app/
│   ├── main.py           # FastAPI app, registers routers, CORS, health
│   ├── routers/
│   │   ├── routes.py     # POST /optimize-route, POST /predict-demand, GET /health
│   ├── services/
│   │   ├── route_optimizer.py    # routing + optimization logic
│   │   ├── demand_forecaster.py  # forecasting logic
│   │   └── data.py               # fetch data from AgriConnect Postgres (read-only)
│   └── schemas.py        # pydantic request/response contracts
├── requirements.txt
└── README.md
```

---

## 6. Data Available From The Backend Database

The AI service **reads (never writes)** the AgriConnect PostgreSQL database (host per integration decision, default `localhost:3006`, db `agriconnect`).

| Table | Useful Fields | Used For |
|---|---|---|
| `price_history` | `crop`, `price`, `unit`, `recorded_at`, `listing_id` | Demand/price trend signals |
| `orders` | `buyer_id`, `listing_id`, `quantity`, `total_price`, `status`, `created_at`, `route` (JSONB) | Actual order/demand history; delivered-route reference |
| `listings` | `farmer_id`, `crop`, `quantity`, `price_per_unit`, `location`, `status` | What the farmer sells + pickup location |
| `users` | `id`, `role`, `location` | Buyer delivery location; seller pickup location |

> **Reality check:** The seed only inserts ~7 crops with 1 history point each, and demo orders are sparse. The forecasting model must therefore be a **baseline-first** model that degrades gracefully with little data and yields a sensible answer even for a single crop.

---

## 7. AI Modules

### 7.1 Module A — Demand Forecasting  (`/predict-demand`)
**Goal:** Given a farmer/FPO, predict near-future demand (next N days) per crop they sell.

**Inputs:**
- `farmerId` (from the authenticated farmer)
- (server-side pull) that farmer's listings + the order history for those crops

**Outputs (per crop):** predicted quantity, confidence, forecast period, and (bonus) suggested price.

**Approach (baseline-first):**
1. Roll up sold quantity per crop per day from `orders.status IN ('confirmed','shipped','delivered')`.
2. Smooth the series (rolling mean / exponential smoothing).
3. Fit a **seasonal-naive** or **ETS/Prophet** model; if too little data (<3 points), fall back to mean-of-last-7-days.
4. Return a short-horizon forecast (e.g., next 7 days).

**Feasibility statement for the demo:** A correct, interpretable baseline is worth more than an overfit model. Deliver naive/ETS first; add Prophet/scikit-learn only if data supports it.

### 7.2 Module B — Route Optimization  (`/optimize-route`)
**Goal:** When a farmer confirms an order, compute an efficient route from pickup (farmer location) to delivery (buyer location), optimizing for distance/duration; support multi-stop if requested.

**Inputs:** `orderId`, `pickup`, `delivery`, `quantity` (passed by backend at confirmation time).

**Outputs:** `distance_km`, `estimated_time_min`, `waypoints` (polyline/ordered stops), `cost`.

**Approach:**
1. **Geocode** pickup & delivery (MAPS_API_KEY; fallback to a coarse match if geocoding fails).
2. **Route** with ORS/OSRM Directions API.
3. **Optimize** when multiple stops exist — use a **nearest-neighbour heuristic**, upgrading to the 2-opt algorithm for the "optimization" angle (this is the explicit optimizable part of the AI work).
4. Cache computed routes by pickup+delivery to avoid repeated API calls in the demo.

---

## 8. API Contract (must match Backend expectations exactly)

The backend (`ordersController.js`) already calls these with a **5-second timeout** and expects these shapes. Fields must be preserved.

### 8.1 `POST /optimize-route`
```jsonc
// Request
{ "orderId": "...", "pickup": "Ludhiana, Punjab", "delivery": "Delhi, India", "quantity": 5 }
// Response (200)
{
  "distance_km": 312.4,
  "estimated_time_min": 350,
  "waypoints": ["Ludhiana, Punjab", "...", "Delhi, India"],
  "cost": 1560.0
}
// Contract — same as PRD-Backend.md §9.4
```

### 8.2 `POST /predict-demand`
```jsonc
// Request
{ "farmerId": "ef4d9c76-..." }
// Response (200)
{ "forecast": [
    { "crop": "Organic Vine Tomatoes", "predicted_demand": 620, "confidence": 0.82, "period": "next 7 days" }
  ] }
// Contract — same as PRD-Backend.md §9.4
```

### 8.3 `GET /health`
```jsonc
// Response
{ "status": "ok" }
```

> **Integration rule:** No other endpoints may be depended on by the backend. Adding extra endpoints is fine, but the three above are the minimum and must remain stable.

---

## 9. Integration With The Backend

| Trigger | AI Endpoint | Result Stored |
|---|---|---|
| Order status → `confirmed` | `POST /optimize-route` | `orders.route` (JSONB) |
| Farmer opens dashboard | `POST /predict-demand` | Returned live (not stored) |

**Robustness requirements (already enforced by backend — AI must comply):**
- Respond within **5 seconds** or the backend treats it as failed (graceful).
- If AI is down → backend proceeds without AI data; **never** block orders or the dashboard.
- AI failures → logged, never bubble up to the user.

**🚩 Open integration decision — resolve before coding (owner: Harsh/Akhil + backend team):**
- Backend `.env.example` sets `AI_SERVICE_URL=http://localhost:5000` but the `ai-service/.env.example` scaffolds `PORT=8000`. **Agree on one port** and keep both `.env` files in sync. Recommend standardizing on a single value (document the decision in both PRDs).

---

## 10. Environment Configuration

`.env` (copy from `.env.example`):
```
PORT=8000            # align with backend's AI_SERVICE_URL (see §9 decision)
MAPS_API_KEY=changeme  # provider: ORS/OSRM/Google — define whichever is chosen
DATABASE_URL=postgres://postgres:abhayyess@localhost:3006/agriconnect  # read-only access
AI_SERVICE_URL=      # (optional) if the service must call out to itself
```

---

## 11. Error Handling & Robustness

| Case | Behavior |
|---|---|
| Maps provider unreachable / bad key | Return a straight-line heuristic route + `distance_km` estimate; log warning |
| Geocoding fails for a location | Use standardized fallback coordinates; still respond |
| Too little historical data for forecast | Return baseline (last N days mean) with **low confidence** + `data_sparse: true` |
| Backend times out waiting | Backend gracefully degrades (its responsibility, already implemented) |

**General rule:** always return a well-formed `200` with the contract shape, or a clear error the backend can ignore — never hang.

---

## 12. Acceptance Criteria (Demo Must-Haves)

**Must-Have**
1. ✅ `GET /health` returns `{status:"ok"}`.
2. ✅ `POST /predict-demand` returns a forecast for a real farmer with **at least 1 crop** using seed data — correct contract shape.
3. ✅ `POST /optimize-route` returns `distance_km`, `estimated_time_min`, `waypoints`, `cost` for sample pickup/delivery.
4. ✅ Both endpoints respect the **5s budget** and never crash the backend.
5. ✅ Forecast/route improve visibly with richer data (demo dataset grown for the pitch).

**Should-Have**
6. 🔸 Multi-stop route optimization demonstrates the **optimization** (2-opt / nearest-neighbour) rather than single point-to-point only.
7. 🔸 Confidence score + suggested price alongside predicted demand.
8. 🔸 Route caching to avoid repeat API calls.

**Out of Scope (this PRD):**
- Real money/pricing engine, fleet management UI, or production-grade ML training pipelines.

---

## 13. Optimization Scope (the "optimizable" part of the AI work)

This section is honoured explicitly because the user highlighted **optimization** as the creative core of the AI task:

| Area | Baseline | Optimization target (build toward) |
|---|---|---|
| **Routing** | Single point-to-point via maps API | Multi-stop **traveling-salesperson** with nearest-neighbour → **2-opt** tour improvement; route **costing** (fuel + time) |
| **Forecasting** | Seasonal-naive / rolling mean | **ETS/ARIMA** → **Prophet**; feature engineering on `price_history` + order volume; confidence intervals |
| **Pricing (bonus)** | Static listing price | Price suggestion from demand signal ('+18% price surge' style advisory) |

**Recommendation:** lock the baseline first (so the demo always works), then showcase one optimization well (2-opt routing is the most visually demonstrable).

---

## 14. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Too little data → poor/embarrassing forecast | High (demo data sparse) | Baseline-first models; clearly label confidence; grow seed data for the pitch |
| Maps API key limits / cost during demo | Medium | Use ORS/OSRM (free tier) + cache routes |
| Port/URL mismatch (8000 vs 5000) breaks integration | Medium | Resolve §9 decision now; keep `.env` in sync |
| Backend timeout during live demo | Medium | Keep routes local; test under 5s; pre-warm caches |
| Scope creep into "heavy ML" | Medium | Ship baselines first; treat advanced models as stretch goals |

---

## 15. Timeline (From Start of AI Work)

| Milestone | Detail |
|---|---|
| **M1 | Contract & scaffold** | FastAPI app spins up, `/health` live, `.env` aligned on port |
| **M2 | Route optimization** | `/optimize-route` works point-to-point, then 2-opt multi-stop |
| **M3 | Demand forecasting** | `/predict-demand` returns baseline forecast for seed data |
| **M4 | Integration test** | Backend confirmed order populates `orders.route`; dashboard shows forecast |
| **M5 | Polish** | Caching, confidence, pricing suggestion, demo dataset grown |
| **Final** | 13 Sep 2026 |

> **Important:** The user has explicitly instructed that **no AI coding starts until they ask.** This PRD is the *agreement* — the build order (M1→M5) activates only when the AI work is green-lit.

---

## 16. Glossary

| Term | Meaning |
|---|---|
| **ETS / ARIMA / Prophet** | Time-series forecasting models |
| **Seasonal-naive** | Predicts next value = same value N periods ago; strong, simple baseline |
| **2-opt / nearest-neighbour** | Heuristics for the Traveling Salesperson Problem (route tour improvement / construction) |
| **ORS / OSRM** | Free open-source routing engines |
| **JSONB** | Postgres JSON column type used to store the computed `route` |
| **AI_SERVICE_URL** | The env var the backend uses to reach this service |

---

### Change Log
| Date | Author | Change |
|---|---|---|
| 2026-09-07 | Claude (for Harsh & Akhil) | v1.0 — initial AI service PRD |