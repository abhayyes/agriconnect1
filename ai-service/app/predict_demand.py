"""
Demand forecasting for AgriConnect.

Deliberately simple, per the plan: a linear price trend + a price-elasticity
relationship (how quantity sold responds to price), both fit with basic
least-squares regression. This is enough to satisfy "uses AI" for the
hackathon and is easy for Akhil to explain, tune, or replace with something
fancier if there's time later.

How it works:
1. At startup, load the mock dataset (data/mock_crop_prices.csv) and, for
   each crop, fit a simple linear model of quantitySoldKg vs pricePerKg
   across all historical records. This captures "when price goes up, does
   demand tend to go down" (or up) for that crop.
2. When a request comes in with historicalPrices (recent prices for that
   crop/region), fit a simple trend line over those to project the *next*
   price.
3. Feed that projected price into the crop's elasticity model to get a
   predicted demand quantity.
4. `confidence` is a rough proxy from how well the two regressions fit their
   data (R²), clipped to a sane range — not a rigorous statistical measure,
   just enough to give the frontend something meaningful to show.

This is intentionally a simple, explainable model, not a deep model — a
production version would use more history, more features (season, region,
holidays), and a proper train/test split.
"""

import csv
import os
from typing import List, Optional
import numpy as np

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "mock_crop_prices.csv")


def _load_crop_price_quantity_pairs():
    """Returns {crop: (prices: list[float], quantities: list[float])}."""
    crop_data = {}
    if not os.path.exists(DATA_PATH):
        return crop_data
    with open(DATA_PATH, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            crop = row["crop"]
            price = float(row["pricePerKg"])
            qty = float(row["quantitySoldKg"])
            crop_data.setdefault(crop, ([], []))
            crop_data[crop][0].append(price)
            crop_data[crop][1].append(qty)
    return crop_data


def _fit_line_with_r2(x: List[float], y: List[float]):
    """Simple least-squares line fit. Returns (slope, intercept, r2)."""
    x_arr = np.array(x, dtype=float)
    y_arr = np.array(y, dtype=float)
    if len(x_arr) < 2 or np.all(x_arr == x_arr[0]):
        # Not enough variation to fit a line meaningfully
        return 0.0, float(np.mean(y_arr)) if len(y_arr) else 0.0, 0.0

    slope, intercept = np.polyfit(x_arr, y_arr, 1)
    predicted = slope * x_arr + intercept
    ss_res = np.sum((y_arr - predicted) ** 2)
    ss_tot = np.sum((y_arr - np.mean(y_arr)) ** 2)
    r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0
    return float(slope), float(intercept), float(max(0.0, min(1.0, r2)))


class DemandModel:
    def __init__(self):
        crop_data = _load_crop_price_quantity_pairs()
        # Per-crop elasticity model: quantity ~ slope * price + intercept
        self.elasticity = {}
        all_prices, all_quantities = [], []
        for crop, (prices, quantities) in crop_data.items():
            slope, intercept, r2 = _fit_line_with_r2(prices, quantities)
            self.elasticity[crop] = (slope, intercept, r2)
            all_prices.extend(prices)
            all_quantities.extend(quantities)

        # Global fallback for crops not in the mock dataset
        self.global_elasticity = _fit_line_with_r2(all_prices, all_quantities)

        # Per-crop average price, used as a fallback when historicalPrices is empty
        self.avg_price = {
            crop: float(np.mean(prices)) for crop, (prices, _) in crop_data.items()
        }

    def predict(self, crop: str, region: str, historical_prices: Optional[List[float]]):
        historical_prices = historical_prices or []

        # Step 1: project the next price from the trend in historicalPrices
        if len(historical_prices) >= 2:
            indices = list(range(len(historical_prices)))
            trend_slope, trend_intercept, trend_r2 = _fit_line_with_r2(indices, historical_prices)
            predicted_price = trend_slope * len(historical_prices) + trend_intercept
        elif len(historical_prices) == 1:
            predicted_price = historical_prices[0]
            trend_r2 = 0.3  # low confidence, only one data point
        else:
            predicted_price = self.avg_price.get(crop, 20.0)  # generic fallback
            trend_r2 = 0.2

        predicted_price = max(0.0, predicted_price)

        # Step 2: convert predicted price into predicted demand via elasticity
        slope, intercept, elasticity_r2 = self.elasticity.get(crop, self.global_elasticity)
        predicted_demand = slope * predicted_price + intercept
        predicted_demand = max(0.0, predicted_demand)

        # Step 3: rough combined confidence, clipped to a believable range
        confidence = 0.4 + 0.5 * ((trend_r2 + elasticity_r2) / 2)
        confidence = round(min(0.95, max(0.35, confidence)), 2)

        return {
            "crop": crop,
            "predictedDemandKg": round(predicted_demand, 1),
            "predictedPricePerKg": round(predicted_price, 2),
            "confidence": confidence,
        }


# Loaded once at startup, reused across requests
_model = DemandModel()


def predict_demand(crop: str, region: str, historical_prices: Optional[List[float]]):
    return _model.predict(crop, region, historical_prices)
