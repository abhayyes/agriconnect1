# AgriConnect — Deployment Guide

Deploy the full stack for free: **Frontend → Vercel**, **Backend + Database + AI → Render**.

## Architecture

```
User → Vercel (React frontend) → Render (Express backend) → Render Postgres
                                                      └→ Render (FastAPI AI service)
```

---

## Part 1 — Render (backend + database + AI) — ~5 min

These deploy **automatically** from `render.yaml` (Blueprint).

1. Go to **https://render.com** → sign up with **GitHub** (use the `abhayyes` account that owns the repo).
2. Click **New → Blueprint**.
3. Connect your GitHub account, then select the **`abhayyes/agriconnect1`** repo.
4. Render reads `render.yaml` and deploys **3 resources** automatically:
   - `agriconnect-db` (PostgreSQL)
   - `agriconnect-backend` (Node/Express)
   - `agriconnect-ai` (Python/FastAPI)
5. On **first deploy**, Render will ask you to provide the **`MAPS_API_KEY`** (optional — AI falls back gracefully without it; you can set any placeholder).
6. Wait until both web services show **Live** and green checkmarks (first build takes ~3–5 min).

**Verify:**
- Backend health → open `https://agriconnect-backend.onrender.com/health` → `{"status":"ok"}`
- AI health → open `https://agriconnect-ai.onrender.com/health` → `{"status":"ok"}`

> ⚠️ **Database schema:** On first backend start, run the migration + seed so there's demo data.
> Render free Postgres gives you an **Internal DB URL**. To seed, connect via a one-off command or use the seed script pointed at the Render connection string.

---

## Part 2 — Vercel (frontend) — ~2 min

1. Go to **https://vercel.com** → sign up with **GitHub** (`abhayyes`).
2. **Add New → Project** → select **`abhayyes/agriconnect1`**.
3. Settings (Vercel auto-detects):
   - Framework: **Vite**
   - **Root Directory:** `frontend`
   - Build: `npm run build` · Output: `dist`
4. **Environment Variables** — add ONE:
   ```
   VITE_API_BASE_URL = https://agriconnect-backend.onrender.com
   ```
5. Click **Deploy**. Live in ~60 seconds.

**Verify:** open your `.vercel.app` URL → login → marketplace listings load from the Render backend.

---

## Keep free-tier services awake

Render free web services **sleep after 15 min idle**. Prevent it:

1. **https://uptimerobot.com** → free account → **Add New Monitor** → type **HTTP(s)**.
2. Add 2 monitors pointing at:
   - `https://agriconnect-backend.onrender.com/health`
   - `https://agriconnect-ai.onrender.com/health`
3. Interval **5 minutes**, keyword `ok`.

Vercel never sleeps — no monitor needed.

---

## File changes made for deployment
- `render.yaml` — Render Blueprint (DB + backend + AI)
- `frontend/vercel.json` — SPA client-side routing rewrite
- `ai-service/runtime.txt` — pins Python 3.11 (compatible binaries for ortools/psycopg2)
- `backend/.env.example` — `AI_SERVICE_URL` aligned to port 8000
- `frontend/src/services/api.js` — reads `import.meta.env.VITE_API_BASE_URL`