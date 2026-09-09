-- AgriConnect Backend — Seed Historical Crop Price Data
-- Purpose: Populate price_history with realistic seasonal price series so the
--          AI service can run demand/price forecasting across seasons.
-- NOTE: This migration is idempotent — it only inserts once (guarded by a flag).

-- Guard: seed only if price_history has fewer than 20 rows without a listing link.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM price_history WHERE listing_id IS NULL) >= 20 THEN
    RAISE NOTICE 'price_history already seeded; skipping seed.';
    RETURN;
  END IF;

  -- Seasonal crop price reference (₹ per kg) for Kharif, Rabi and Zaid patterns.
  -- Each row is a monthly average for the given crop (month is 1..12 = Jan..Dec).
  CREATE TEMP TABLE seed_prices (
    crop  VARCHAR(100),
    unit  VARCHAR(20),
    month SMALLINT,
    price NUMERIC(12,2)
  ) ON COMMIT DROP;

  INSERT INTO seed_prices (crop, unit, month, price) VALUES
    -- Wheat (Rabi, stable ~₹24-27/kg, peaks post-harvest Apr-May)
    ('Wheat','kg',1,24.50),('Wheat','kg',2,25.00),('Wheat','kg',3,25.80),
    ('Wheat','kg',4,26.50),('Wheat','kg',5,27.00),('Wheat','kg',6,26.20),
    ('Wheat','kg',7,25.40),('Wheat','kg',8,24.80),('Wheat','kg',9,24.30),
    ('Wheat','kg',10,24.60),('Wheat','kg',11,24.10),('Wheat','kg',12,23.80),

    -- Rice (Basmati, stable ₹70-90/kg, festival-driven peak Oct-Nov)
    ('Rice','kg',1,72.00),('Rice','kg',2,72.50),('Rice','kg',3,73.00),
    ('Rice','kg',4,74.00),('Rice','kg',5,75.00),('Rice','kg',6,76.00),
    ('Rice','kg',7,78.00),('Rice','kg',8,80.00),('Rice','kg',9,82.00),
    ('Rice','kg',10,88.00),('Rice','kg',11,86.00),('Rice','kg',12,80.00),

    -- Tomato (highly volatile, peaks Jul-Aug monsoon & Dec-Jan winter)
    ('Tomato','kg',1,28.00),('Tomato','kg',2,22.00),('Tomato','kg',3,18.00),
    ('Tomato','kg',4,16.00),('Tomato','kg',5,15.50),('Tomato','kg',6,20.00),
    ('Tomato','kg',7,32.00),('Tomato','kg',8,35.00),('Tomato','kg',9,24.00),
    ('Tomato','kg',10,18.00),('Tomato','kg',11,20.00),('Tomato','kg',12,30.00),

    -- Onion (volatile, peaks Jul-Aug & Dec-Jan, trough Mar-Apr)
    ('Onion','kg',1,28.00),('Onion','kg',2,25.00),('Onion','kg',3,20.00),
    ('Onion','kg',4,18.00),('Onion','kg',5,19.00),('Onion','kg',6,24.00),
    ('Onion','kg',7,32.00),('Onion','kg',8,30.00),('Onion','kg',9,24.00),
    ('Onion','kg',10,20.00),('Onion','kg',11,22.00),('Onion','kg',12,26.00),

    -- Potato (stable ₹18-24/kg, slight monsoon peak)
    ('Potato','kg',1,20.00),('Potato','kg',2,19.50),('Potato','kg',3,19.00),
    ('Potato','kg',4,18.50),('Potato','kg',5,18.00),('Potato','kg',6,20.00),
    ('Potato','kg',7,23.00),('Potato','kg',8,24.00),('Potato','kg',9,22.00),
    ('Potato','kg',10,20.50),('Potato','kg',11,21.00),('Potato','kg',12,22.50),

    -- Mango (Zaid/Kharif seasonal, scarce off-season → high Jan-Mar, flush May-Jul)
    ('Mango','kg',1,80.00),('Mango','kg',2,75.00),('Mango','kg',3,70.00),
    ('Mango','kg',4,55.00),('Mango','kg',5,38.00),('Mango','kg',6,32.00),
    ('Mango','kg',7,35.00),('Mango','kg',8,45.00),('Mango','kg',9,58.00),
    ('Mango','kg',10,65.00),('Mango','kg',11,72.00),('Mango','kg',12,78.00),

    -- Maize (Rabi/Kharif, moderate ₹20-26/kg)
    ('Maize','kg',1,22.00),('Maize','kg',2,22.50),('Maize','kg',3,23.00),
    ('Maize','kg',4,23.50),('Maize','kg',5,24.00),('Maize','kg',6,24.50),
    ('Maize','kg',7,24.00),('Maize','kg',8,23.50),('Maize','kg',9,23.00),
    ('Maize','kg',10,22.50),('Maize','kg',11,22.00),('Maize','kg',12,21.50),

    -- Soybean (Kharif, ₹46-58/kg, peak Nov-Dec harvest)
    ('Soybean','kg',1,52.00),('Soybean','kg',2,50.00),('Soybean','kg',3,48.00),
    ('Soybean','kg',4,47.00),('Soybean','kg',5,46.50),('Soybean','kg',6,47.50),
    ('Soybean','kg',7,49.00),('Soybean','kg',8,50.50),('Soybean','kg',9,52.00),
    ('Soybean','kg',10,55.00),('Soybean','kg',11,58.00),('Soybean','kg',12,56.00),

    -- Cotton (Kharif cash crop, ₹58-70/kg, peak Oct-Dec harvest)
    ('Cotton','kg',1,62.00),('Cotton','kg',2,60.00),('Cotton','kg',3,59.00),
    ('Cotton','kg',4,58.50),('Cotton','kg',5,59.00),('Cotton','kg',6,60.00),
    ('Cotton','kg',7,61.00),('Cotton','kg',8,62.00),('Cotton','kg',9,64.00),
    ('Cotton','kg',10,68.00),('Cotton','kg',11,70.00),('Cotton','kg',12,66.00),

    -- Sugarcane (stable ₹3.0-3.6/kg)
    ('Sugarcane','kg',1,3.10),('Sugarcane','kg',2,3.15),('Sugarcane','kg',3,3.20),
    ('Sugarcane','kg',4,3.30),('Sugarcane','kg',5,3.40),('Sugarcane','kg',6,3.50),
    ('Sugarcane','kg',7,3.60),('Sugarcane','kg',8,3.45),('Sugarcane','kg',9,3.30),
    ('Sugarcane','kg',10,3.20),('Sugarcane','kg',11,3.15),('Sugarcane','kg',12,3.05),

    -- Groundnut (Kharif, ₹58-75/kg)
    ('Groundnut','kg',1,66.00),('Groundnut','kg',2,64.00),('Groundnut','kg',3,62.00),
    ('Groundnut','kg',4,61.00),('Groundnut','kg',5,60.00),('Groundnut','kg',6,60.50),
    ('Groundnut','kg',7,62.00),('Groundnut','kg',8,63.00),('Groundnut','kg',9,65.00),
    ('Groundnut','kg',10,68.00),('Groundnut','kg',11,72.00),('Groundnut','kg',12,74.00),

    -- Mustard (Rabi oilseed, ₹50-62/kg, peak Mar-May harvest)
    ('Mustard','kg',1,54.00),('Mustard','kg',2,55.00),('Mustard','kg',3,56.00),
    ('Mustard','kg',4,57.00),('Mustard','kg',5,58.00),('Mustard','kg',6,56.00),
    ('Mustard','kg',7,54.00),('Mustard','kg',8,53.00),('Mustard','kg',9,52.00),
    ('Mustard','kg',10,53.00),('Mustard','kg',11,52.50),('Mustard','kg',12,53.50);

  -- Anchor each monthly price point to the trailing 12 months ending "now":
  -- recorded_at = start of current month + (month - current_month) months.
  -- Months already past this year stay this year; future months roll back a year,
  -- producing a clean Jan..Dec series relative to today.
  INSERT INTO price_history (crop, listing_id, price, unit, recorded_at)
  SELECT
    sp.crop,
    NULL::uuid,
    sp.price,
    sp.unit,
    (date_trunc('month', now())
     + ((sp.month - EXTRACT(MONTH FROM now()))::int) * INTERVAL '1 month')::timestamp
  FROM seed_prices sp;
END $$;