"""
API Router for AgriConnect AI Service
Author: Harsh (AI & Logistics Lead)
"""

from fastapi import APIRouter, HTTPException
from typing import List

from app.schemas import (
    HealthResponse,
    PredictDemandRequest,
    PredictDemandResponse,
    OptimizeRouteRequest,
    OptimizeRouteResponse,
    CropDemandForecast
)
from app.services.demand_forecaster import get_forecaster
from app.services.route_optimizer import optimize_delivery_route

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health status check endpoint."""
    return HealthResponse(status="ok", service="ai-service")


@router.post("/predict-demand", response_model=PredictDemandResponse)
def predict_demand(req: PredictDemandRequest):
    """
    Demand forecasting endpoint.
    Supports either:
    1. farmerId / farmer_id: fetches farmer's crops and orders from database.
    2. crop + region + historicalPrices: specific crop forecast.
    """
    forecaster = get_forecaster()

    farmer_id = req.farmerId or req.farmer_id

    if req.crop:
        forecast_list = forecaster.forecast_single_crop(
            crop=req.crop,
            region=req.region,
            historical_prices=req.historicalPrices
        )
    else:
        forecast_list = forecaster.forecast_for_farmer(farmer_id=farmer_id)

    return PredictDemandResponse(forecast=forecast_list)


@router.post("/optimize-route", response_model=OptimizeRouteResponse)
def optimize_route(req: OptimizeRouteRequest):
    """
    Route optimization endpoint.
    Computes optimal route, ETA, distance, and cost.
    """
    pickup = req.pickup or req.origin
    delivery = req.delivery or req.destination
    waypoints = req.waypoints or []
    quantity = req.quantity or 1.0

    return optimize_delivery_route(
        pickup=pickup,
        delivery=delivery,
        waypoints=waypoints,
        quantity=quantity
    )
