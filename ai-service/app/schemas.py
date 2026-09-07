from pydantic import BaseModel, Field
from typing import List, Optional, Union, Dict, Any

# ==========================================
# 1. Health Schema
# ==========================================
class HealthResponse(BaseModel):
    status: str = "ok"
    service: Optional[str] = "ai-service"


# ==========================================
# 2. Demand Forecasting Schemas
# ==========================================

# Individual crop demand forecast item (PRD §8.2)
class CropDemandForecast(BaseModel):
    crop: str
    predicted_demand: float
    confidence: float
    period: str = "next 7 days"
    suggested_price: Optional[float] = None
    historical_points_used: Optional[int] = None
    data_sparse: Optional[bool] = False

# Backend Standard Request (PRD §8.2)
class PredictDemandRequest(BaseModel):
    farmerId: Optional[str] = None
    farmer_id: Optional[str] = None
    crop: Optional[str] = None
    region: Optional[str] = None
    historicalPrices: Optional[List[float]] = []

# Response returning array of forecasts
class PredictDemandResponse(BaseModel):
    forecast: List[CropDemandForecast]


# ==========================================
# 3. Route Optimization Schemas
# ==========================================

class LatLng(BaseModel):
    lat: float
    lng: float

class OptimizeRouteRequest(BaseModel):
    orderId: Optional[str] = None
    order_id: Optional[str] = None
    pickup: Optional[Union[str, LatLng]] = None
    delivery: Optional[Union[str, LatLng]] = None
    quantity: Optional[float] = 1.0
    # Also support direct coordinates/waypoints
    origin: Optional[LatLng] = None
    destination: Optional[LatLng] = None
    waypoints: Optional[List[Union[str, LatLng]]] = []

class OptimizeRouteResponse(BaseModel):
    distance_km: float
    estimated_time_min: float
    waypoints: List[Union[str, Dict[str, Any], LatLng]]
    cost: float
