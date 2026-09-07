"""
Test suite for AgriConnect AI Service (Demand Forecasting & Route Optimization)
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_predict_demand_farmer_id():
    response = client.post("/predict-demand", json={"farmerId": "ef4d9c76-sample-farmer"})
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert isinstance(data["forecast"], list)
    assert len(data["forecast"]) > 0
    item = data["forecast"][0]
    assert "crop" in item
    assert "predicted_demand" in item
    assert "confidence" in item
    assert "period" in item
    assert "suggested_price" in item


def test_predict_demand_single_crop():
    response = client.post("/predict-demand", json={
        "crop": "Organic Vine Tomatoes",
        "region": "Sonipat, Haryana",
        "historicalPrices": [24.0, 25.5, 27.0]
    })
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert len(data["forecast"]) == 1
    item = data["forecast"][0]
    assert item["crop"] == "Organic Vine Tomatoes"
    assert item["predicted_demand"] > 0
    assert 0.0 <= item["confidence"] <= 1.0


def test_optimize_route_named_locations():
    response = client.post("/optimize-route", json={
        "orderId": "test-order-1",
        "pickup": "Ludhiana, Punjab",
        "delivery": "Delhi, India",
        "quantity": 5
    })
    assert response.status_code == 200
    data = response.json()
    assert "distance_km" in data
    assert "estimated_time_min" in data
    assert "waypoints" in data
    assert "cost" in data
    assert data["distance_km"] > 0
    assert data["cost"] > 0
