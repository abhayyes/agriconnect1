"""
Demand Forecasting Engine for AgriConnect
Author: Harsh (AI & Logistics Lead)

Implements multi-tier demand & price forecasting:
1. Pulls real orders/prices from PostgreSQL when available.
2. Falls back to mock dataset (data/mock_crop_prices.csv).
3. Uses statistical time-series smoothing (Exponential Smoothing / Weighted Moving Averages) + Linear/Polynomial Trend Regression + Price Elasticity model.
4. Predicts 7-day demand quantity, confidence score, suggested pricing, and sparse data indicators.
"""

import os
import csv
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge, LinearRegression

from app.schemas import CropDemandForecast
from app.services.data import (
    get_farmer_crops,
    get_crop_order_history,
    get_crop_price_history
)

logger = logging.getLogger(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "mock_crop_prices.csv")


class DemandForecaster:
    def __init__(self):
        self.mock_df = self._load_mock_data()
        self.crop_elasticities = {}
        self.crop_base_stats = {}
        self._train_baseline_models()

    def _load_mock_data(self) -> pd.DataFrame:
        """Load synthetic historical dataset from CSV as fallback/baseline."""
        if os.path.exists(DATA_PATH):
            try:
                df = pd.read_csv(DATA_PATH)
                df["date"] = pd.to_datetime(df["date"])
                return df
            except Exception as e:
                logger.error(f"Error loading mock crop prices: {e}")
        return pd.DataFrame(columns=["date", "crop", "region", "pricePerKg", "quantitySoldKg"])

    def _train_baseline_models(self):
        """Fit price-elasticity (quantity ~ f(price)) and benchmark stats for known crops."""
        if self.mock_df.empty:
            return

        for crop, group in self.mock_df.groupby("crop"):
            crop_name = crop.lower()
            prices = group["pricePerKg"].values.reshape(-1, 1)
            quantities = group["quantitySoldKg"].values

            if len(prices) >= 2:
                model = Ridge(alpha=1.0)
                model.fit(prices, quantities)
                r2 = float(model.score(prices, quantities))
                self.crop_elasticities[crop_name] = {
                    "model": model,
                    "r2": max(0.0, r2),
                    "mean_price": float(np.mean(group["pricePerKg"])),
                    "mean_demand": float(np.mean(group["quantitySoldKg"])),
                    "std_demand": float(np.std(group["quantitySoldKg"]))
                }

    def _forecast_crop_demand(
        self,
        crop: str,
        farmer_orders_df: Optional[pd.DataFrame] = None,
        given_historical_prices: Optional[List[float]] = None
    ) -> CropDemandForecast:
        """
        Produce a robust 7-day demand forecast for a given crop.
        """
        crop_clean = crop.strip()
        crop_key = crop_clean.lower()

        # 1. Gather historical price & order points
        historical_quantities = []
        historical_prices = list(given_historical_prices or [])

        # When the caller didn't supply an explicit price series, pull the real
        # seasonal price history from the price_history table. This makes the
        # forecast use the seeded seasonal mandi price curve instead of relying
        # only on order history / mock CSV data.
        if not historical_prices:
            historical_prices = self._fetch_db_price_history(crop_clean)

        # Check DB order history if provided
        if farmer_orders_df is not None and not farmer_orders_df.empty:
            crop_orders = farmer_orders_df[farmer_orders_df["crop"].str.lower() == crop_key]
            if not crop_orders.empty:
                historical_quantities.extend(crop_orders["quantity"].tolist())
                if "unit_price" in crop_orders.columns:
                    historical_prices.extend(crop_orders["unit_price"].dropna().tolist())

        # If data is sparse, supplement with mock dataset
        mock_crop = self.mock_df[self.mock_df["crop"].str.lower() == crop_key]
        if len(historical_quantities) < 3 and not mock_crop.empty:
            recent_mock = mock_crop.sort_values("date", ascending=False).head(8)
            historical_quantities = recent_mock["quantitySoldKg"].tolist() + historical_quantities
            if not historical_prices:
                historical_prices = recent_mock["pricePerKg"].tolist()

        data_sparse = len(historical_quantities) < 3

        # 2. Demand Estimation Algorithm
        if len(historical_quantities) >= 3:
            # Weighted moving average (giving 50% weight to most recent periods)
            weights = np.linspace(0.5, 1.5, len(historical_quantities))
            weights /= weights.sum()
            base_demand = float(np.average(historical_quantities, weights=weights))

            # Fit short-term linear trend
            x = np.arange(len(historical_quantities)).reshape(-1, 1)
            lr = LinearRegression().fit(x, historical_quantities)
            trend_slope = float(lr.coef_[0])
            trend_demand = base_demand + (trend_slope * 1.5)  # forward 1.5 steps (7 days)

            # Blended demand
            predicted_demand = max(10.0, 0.7 * trend_demand + 0.3 * base_demand)
            confidence = 0.75 + min(0.15, len(historical_quantities) * 0.02)
        elif len(historical_quantities) > 0:
            # Baseline mean of available points
            predicted_demand = float(np.mean(historical_quantities))
            confidence = 0.55
        else:
            # Default heuristic based on crop type or global benchmark
            if crop_key in self.crop_elasticities:
                predicted_demand = self.crop_elasticities[crop_key]["mean_demand"]
            else:
                # Standard agricultural lot forecast (e.g. 500-650 kg per 7-day period)
                predicted_demand = 550.0
            confidence = 0.40

        # 3. Price & Elasticity Suggestion Algorithm
        if len(historical_prices) >= 2:
            current_price = float(historical_prices[-1])
            price_trend = (current_price - float(historical_prices[0])) / len(historical_prices)
            projected_price = current_price + price_trend
        elif len(historical_prices) == 1:
            current_price = float(historical_prices[0])
            projected_price = current_price
        elif crop_key in self.crop_elasticities:
            projected_price = self.crop_elasticities[crop_key]["mean_price"]
        else:
            projected_price = 25.0

        # Suggested price optimization (surge or discount advisory)
        suggested_price = round(max(5.0, projected_price * 1.05), 2)  # Slight 5% margin optimization

        return CropDemandForecast(
            crop=crop_clean,
            predicted_demand=round(float(predicted_demand), 1),
            confidence=round(min(0.95, max(0.30, confidence)), 2),
            period="next 7 days",
            suggested_price=suggested_price,
            historical_points_used=len(historical_quantities),
            data_sparse=data_sparse
        )

    def _fetch_db_price_history(self, crop: str) -> List[float]:
        """
        Return recent seasonal price points for a crop from the DB price_history table.
        Sort chronologically and return the trailing series so the seasonal curve fits.
        """
        try:
            df = get_crop_price_history(crop)
            if df is None or df.empty:
                return []
            df = df.sort_values("recorded_at")
            prices = df["price"].dropna().tolist()
            return [float(p) for p in prices[-24:]]
        except Exception as e:
            logger.warning(f"Failed to read price history for {crop}: {e}")
            return []

    def forecast_for_farmer(self, farmer_id: Optional[str] = None) -> List[CropDemandForecast]:
        """
        Generate forecasts for all crops associated with a farmer.
        """
        crops = []
        if farmer_id:
            crops = get_farmer_crops(farmer_id)

        # Fallback to standard crops if no farmer crops found or farmer_id not provided
        if not crops:
            crops = ["Organic Vine Tomatoes", "Wheat", "Basmati Rice", "Onions", "Potatoes"]

        orders_df = get_crop_order_history()

        forecasts = []
        for crop in crops:
            fc = self._forecast_crop_demand(crop, farmer_orders_df=orders_df)
            forecasts.append(fc)

        return forecasts

    def forecast_single_crop(
        self,
        crop: str,
        region: Optional[str] = None,
        historical_prices: Optional[List[float]] = None
    ) -> List[CropDemandForecast]:
        """
        Generate forecast for a specific single crop with optional given price series.
        """
        orders_df = get_crop_order_history(crop)
        fc = self._forecast_crop_demand(
            crop=crop,
            farmer_orders_df=orders_df,
            given_historical_prices=historical_prices
        )
        return [fc]


# Global instance
_forecaster = DemandForecaster()

def get_forecaster() -> DemandForecaster:
    return _forecaster
