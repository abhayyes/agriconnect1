# Quick Database Setup for AgriConnect Backend

## Option 1: Free Hosted PostgreSQL (Recommended - 2 minutes)

### Using ElephantSQL (Free Tier)
1. Go to https://www.elephantsql.com
2. Click "Try Free" or "Sign Up"
3. Sign up with email (no credit card needed)
4. Create a new database:
   - Name: `agriconnect`
   - Plan: `Tiny` (free, 20MB)
   - Region: Choose closest to you
5. Copy the **PG connection string** (looks like `postgres://user:pass@host:5432/dbname`)
6. Update `backend/.env` with this connection string

### Using Neon (Alternative)
1. Go to https://neon.tech
2. Sign up with GitHub
3. Create a new project (default settings)
4. Copy the connection string from Project Settings
5. Update `backend/.env`

---

## Option 2: Local PostgreSQL (10 minutes)

1. Download PostgreSQL: https://www.postgresql.org/download/windows/
2. Run installer (check "Stack Builder" and "pgAdmin")
3. Remember the password you set for `postgres` user
4. After install, open "SQL Shell (psql)" and run:
   ```sql
   CREATE DATABASE agriconnect;
   \q
   ```
5. Update `backend/.env`:
   ```
   DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/agriconnect
   ```

---

## After Setting Up Database URL

1. Update `.env` with your connection string
2. Run migrations:
   ```bash
   npm run migrate
   ```
3. Start server:
   ```bash
   npm run dev
   ```

---

## Verify Setup

Once running, test with:
```bash
curl http://localhost:8080/health
# Should return: {"status":"ok","timestamp":"..."}
```
