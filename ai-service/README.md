# AgriConnect AI Service

Intelligent standalone AI & Logistics microservice for **AgriConnect (SIH 2026)**.

## Capabilities

1. **Demand Forecasting (`/predict-demand`)**:
   - Time-series statistical smoothing (WMA) & linear trend regression with `scikit-learn`.
   - Price elasticity modeling (`Ridge` regression) and dynamic price advisory.
   - Dynamic confidence scores and data sparsity flags.
   - Reads historical orders from AgriConnect PostgreSQL when connected, with graceful fallback to `mock_crop_prices.csv`.

2. **Route Optimization (`/optimize-route`)**:
   - Multi-stop open-path Traveling Salesperson Problem (TSP) solver using **Google OR-Tools** (Guided Local Search / 2-opt metaheuristics).
   - Built-in geocoding for Indian agricultural hubs and cities.
   - Haversine + road winding factor distance, ETA, waypoints, and logistics transport costing.

3. **Health Check (`/health`)**:
   - Microservice health probe.

---

## API Contract

### 1. `GET /health`
```json
{
  "status": "ok",
  "service": "ai-service"
}
```

### 2. `POST /predict-demand`
**Request:**
```json
{
  "farmerId": "ef4d9c76-...",
  "crop": "Organic Vine Tomatoes",
  "region": "Sonipat, Haryana",
  "historicalPrices": [24.0, 25.5, 27.0]
}
```
**Response:**
```json
{
  "forecast": [
    {
      "crop": "Organic Vine Tomatoes",
      "predicted_demand": 620.0,
      "confidence": 0.82,
      "period": "next 7 days",
      "suggested_price": 28.35,
      "historical_points_used": 8,
      "data_sparse": false
    }
  ]
}
```

### 3. `POST /optimize-route`
**Request:**
```json
{
  "orderId": "ord-1234",
  "pickup": "Ludhiana, Punjab",
  "delivery": "Delhi, India",
  "quantity": 5
}
```
**Response:**
```json
{
  "distance_km": 312.4,
  "estimated_time_min": 416,
  "waypoints": ["Ludhiana, Punjab", "Delhi, India"],
  "cost": 1572.0
}
```

---

## Setup & Running

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and adjust database/port settings as needed.
   ```bash
   cp .env.example .env
   ```

3. **Run the server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. **Run tests:**
   ```bash
   python test_service.py
   ```
