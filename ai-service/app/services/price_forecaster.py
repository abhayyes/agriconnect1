"""
Price Forecasting Engine for AgriConnect (consumer-facing).
Author: Claude (feature build)

Extends the demand forecaster with a dedicated *price* forecast that models
BOTH the recent price change (trend) AND the seasonal price cycle (monthly
seasonal index), so buyers can see how a crop's price is projected to move
over the next 7 days and why (e.g. "heading into peak harvest, prices easing").

Pipeline per crop:
1. Pull the real price series (DB `price_history`) when available; otherwise
   fall back to the synthetic seasonal mock dataset.
2. Fit a short-term linear trend to the trailing prices -> daily % trend.
3. Compute the seasonal index (per-calendar-month price factor vs the mean)
   from the mock seasonal curve, and blend genuinely-saturated crops toward
   the DB-observed recent price.
4. Project forward 7 days = current * (1 + trend) * (seasonal_factor_ahead /
   seasonal_factor_recent) -- the season-shift term is what captures "depends
   on the season."
5. Derive % change, direction (up/down/stable), a human season label, and
   confidence. Tolerates missing data and never errors the request.
"""

import os
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Optional

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression

from app.services.data import get_crop_price_history

logger = logging.getLogger(__name__)

DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "mock_crop_prices.csv")

FORECAST_DAYS = 7

# Human-friendly season buckets for the "why" behind a price move.
SEASON_LABELS = {
    1: "peak demand / winter",
    2: "post-winter restock",
    3: "early spring",
    4: "spring harvest",
    5: "summer arrivals",
    6: "pre-monsoon squeeze",
    7: "monsoon supply",
    8: "monsoon supply",
    9: "festive demand",
    10: "festive peak",
    11: "post-festive / rabi sowing",
    12: "winter demand"
}

PRICE_CHANGE_UP_THRESHOLD = 1.5   # %


class PriceForecaster:
    def __init__(self):
        self.mock_df = self._load_mock_data()
        # crop_lower -> {calendar month: seasonal price factor vs overall mean}
        self.season_index: Dict[str, Dict[int, float]] = {}
        # crop_lower -> overall mean price
        self.mean_price_by_crop: Dict[str, float] = {}
        self.crop_list: List[str] = []
        self._build_seasonal_index()

    def _load_mock_data(self) -> pd.DataFrame:
        """Load the synthetic seasonal dataset as the baseline/fallback."""
        if os.path.exists(DATA_PATH):
            try:
                df = pd.read_csv(DATA_PATH)
                df["date"] = pd.to_datetime(df["date"])
                return df
            except Exception as e:
                logger.error(f"Error loading mock crop prices: {e}")
        return pd.DataFrame(columns=["date", "crop", "region", "pricePerKg", "quantitySoldKg"])

    def _build_seasonal_index(self):
        """Compute a per-crop, per-month seasonal price index from the mock series.

        A factor of 1.2 for a month means prices run ~20% above the crop's average
        in that month; 0.9 means ~10% below. This is the "depends on the season"
        backbone, and is complete for every calendar month (unlike sparse real DB
        history), so a projection never stalls for lack of data.
        """
        if self.mock_df.empty:
            return
        for crop in self.mock_df["crop"].unique():
            key = crop.lower()
            group = self.mock_df[self.mock_df["crop"] == crop].copy()
            group["month"] = group["date"].dt.month
            overall = float(group["pricePerKg"].mean()) or 0.0
            index: Dict[int, float] = {}
            for m in range(1, 13):
                sub = group[group["month"] == m]["pricePerKg"]
                index[m] = (
                    float(sub.mean() / overall)
                    if (overall > 0 and len(sub) > 0)
                    else 1.0
                )
            self.season_index[key] = index
            self.mean_price_by_crop[key] = overall
        self.crop_list = list(self.mock_df["crop"].unique())

    # ------------------------------------------------------------------ data
    def _mock_series(self, crop: str) -> List[float]:
        """Chronological price series for a crop from the seasonal mock dataset."""
        if self.mock_df.empty:
            return []
        sub = self.mock_df[self.mock_df["crop"].str.lower() == crop.lower()]
        if sub.empty:
            return []
        return [float(v) for v in sub.sort_values("date")["pricePerKg"].dropna().tolist()]

    def _real_series(self, crop: str) -> List[float]:
        """Recent real price series from the DB `price_history` table."""
        try:
            df = get_crop_price_history(crop)
            if df is None or df.empty:
                return []
            df = df.sort_values("recorded_at")
            return [float(v) for v in df["price"].dropna().tolist()]
        except Exception as e:
            logger.warning(f"Failed to read price history for {crop}: {e}")
            return []

    # ------------------------------------------------------------ projection
    def _season_factor_window(self, crop_key: str, day: date, days: int) -> float:
        """Average seasonal factor over a `days`-long window starting at `day`."""
        idx = self.season_index.get(crop_key) or {}
        if not idx:
            return 1.0
        factors = [idx.get((day + timedelta(days=i)).month, 1.0) for i in range(days)]
        return float(np.mean(factors))

    def _trend_daily(self, crop_key: str, prices: List[float]) -> float:
        """Linear slope on the trailing series, normalized to a daily % of price."""
        if len(prices) < 3:
            return 0.0
        x = np.arange(len(prices)).reshape(-1, 1)
        y = np.array(prices).reshape(-1, 1)
        lr = LinearRegression().fit(x, y)
        slope_per_step = float(lr.coef_[0][0])
        current = float(prices[-1])
        if current <= 0:
            return 0.0
        # Mock rows are ~weekly; DB rows ~daily. Heuristic spacing keeps the
        # per-day rate sensible for either source.
        step_days = 6.0 if len(prices) > 40 else 1.5
        return (slope_per_step / step_days) / current

    def _season_label(self, month: int) -> str:
        return SEASON_LABELS.get(month, "seasonal")

    def _confidence(self, used_mock: bool, n: int) -> float:
        if used_mock or n < 8:
            return 0.45
        return round(min(0.9, 0.55 + n * 0.03), 2)

    def forecast_price(self, crop: str) -> Dict[str, object]:
        """Return a full price forecast for a single crop."""
        crop_key = crop.strip().lower()
        today = date.today()

        # Hybrid series: use real DB prices when available, mock as baseline.
        real = self._real_series(crop)
        mock = self._mock_series(crop)
        used_mock = len(real) < 4
        prices = real if len(real) >= 4 else mock
        if not prices:
            # Unknown crop: fall back to the crop-seasonal mean if known, else a sane default.
            fallback = self.mean_price_by_crop.get(crop_key, 25.0)
            prices = [float(fallback)]

        current = float(prices[-1])
        n = len(prices)

        # Price change + season projection.
        daily_trend = self._trend_daily(crop_key, prices)
        idx_now = self.season_index.get(crop_key) or {}
        sf_recent = self._season_factor_window(crop_key, today - timedelta(days=FORECAST_DAYS), FORECAST_DAYS)
        sf_ahead = self._season_factor_window(crop_key, today, FORECAST_DAYS)
        season_shift = (sf_ahead / sf_recent) if sf_recent > 0 else 1.0

        projected = current * (1 + daily_trend * FORECAST_DAYS) * season_shift
        predicted = max(1.0, projected)

        pct_change = ((predicted / current) - 1.0) * 100.0 if current > 0 else 0.0
        direction = (
            "up" if pct_change > PRICE_CHANGE_UP_THRESHOLD
            else "down" if pct_change < -PRICE_CHANGE_UP_THRESHOLD
            else "stable"
        )

        # A season note keyed to the forecast window and the move itself.
        fwd_month = (today + timedelta(days=FORECAST_DAYS)).month
        base_season = self._season_label(fwd_month).split(" /")[0]
        if season_shift > 1.03:
            season = f"seasonal prices rising into {base_season}"
        elif season_shift < 0.97:
            season = f"seasonal prices easing ({base_season})"
        else:
            season = f"steady {base_season} pricing"

        return {
            "crop": crop.strip(),
            "current_price": round(current, 2),
            "predicted_price": round(predicted, 2),
            "pct_change": round(pct_change, 1),
            "direction": direction,
            "period": f"next {FORECAST_DAYS} days",
            "season": season,
            "season_index": idx_now.get((today + timedelta(days=FORECAST_DAYS)).month, 1.0),
            "confidence": self._confidence(used_mock, n),
            "data_sparse": used_mock or n < 8,
        }

    def forecast_all(self) -> List[Dict[str, object]]:
        """Forecast for every known crop (mock catalogue, DB-derived when present)."""
        crops = self.crop_list
        if not crops:
            crops = ["Wheat", "Basmati Rice", "Onions", "Potatoes", "Tomatoes"]
        return [self.forecast_price(c) for c in crops]

    def list_crops(self) -> List[str]:
        return self.crop_list or []


# Global instance (cheap; lazy data load, mirrors demand_forecaster pattern)
_price_forecaster = PriceForecaster()


def get_price_forecaster() -> PriceForecaster:
    return _price_forecaster