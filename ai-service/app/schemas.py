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
# 3. Consumer Price Forecast Schemas
# ==========================================

# Per-crop price forecast for buyers (trend + season feature)
class PriceForecast(BaseModel):
    crop: str
    current_price: float
    predicted_price: float
    pct_change: float
    direction: str                 # up | down | stable
    period: str = "next 7 days"
    season: Optional[str] = None
    season_index: Optional[float] = None
    confidence: float
    data_sparse: Optional[bool] = False

class PriceForecastRequest(BaseModel):
    crops: Optional[List[str]] = None   # empty -> all known crops

class PriceForecastResponse(BaseModel):
    forecast: List[PriceForecast]


# ==========================================
# 4. Route Optimization Schemas
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
    # Drawable route geometry for map rendering
    pickup_coords: Optional[LatLng] = None
    delivery_coords: Optional[LatLng] = None
    polyline: Optional[List[LatLng]] = None  # ordered road geometry (OSRM), null on fallback


# ==========================================
# 4. Kisan Assistant Chat (LLM) Schemas
# ==========================================

# A single turn in the chat history (optional context for the LLM)
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    query: str
    language: str = "en"  # "en" | "hi"
    history: Optional[List[ChatMessage]] = []

class ChatResponse(BaseModel):
    reply: str
