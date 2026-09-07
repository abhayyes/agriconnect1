"""
Generates a synthetic crop price dataset for AgriConnect's demand forecasting
model. Real data (e.g. from Agmarknet) can replace this later, but for the
hackathon deadline, synthetic data with a believable trend + seasonality +
noise is enough for Akhil's model to train against.

Output: data/mock_crop_prices.csv with columns:
date, crop, region, pricePerKg, quantitySoldKg

Run: python scripts/generate_mock_data.py
"""

import csv
import random
import math
from datetime import date, timedelta

CROPS = {
    # crop: (base price per kg in INR, seasonal peak month 1-12, volatility)
    "wheat":   (22.0, 4,  0.06),
    "rice":    (28.0, 10, 0.05),
    "onion":   (18.0, 12, 0.15),
    "tomato":  (15.0, 6,  0.20),
    "potato":  (12.0, 2,  0.10),
}

REGIONS = ["Sonipat, Haryana", "Nashik, Maharashtra", "Indore, MP", "Dehradun, Uttarakhand"]

START_DATE = date(2025, 1, 1)
END_DATE = date(2026, 8, 1)
DAYS_BETWEEN_SAMPLES = 7  # one price point per week, per crop, per region

random.seed(42)  # reproducible output


def seasonal_multiplier(day: date, peak_month: int) -> float:
    """Prices rise toward the peak month and fall away from it (sinusoidal)."""
    month_diff = min(
        abs(day.month - peak_month),
        12 - abs(day.month - peak_month),
    )
    return 1.0 + 0.25 * math.cos(month_diff / 6 * math.pi)


def generate_rows():
    rows = []
    for crop, (base_price, peak_month, volatility) in CROPS.items():
        for region in REGIONS:
            # each region has a slight fixed offset so regions aren't identical
            region_offset = 1.0 + (hash(region + crop) % 100) / 1000  # ~1.00-1.10
            current = START_DATE
            # slow upward drift over the whole period, like real inflation
            total_days = (END_DATE - START_DATE).days
            while current <= END_DATE:
                days_in = (current - START_DATE).days
                drift = 1.0 + 0.08 * (days_in / total_days)  # ~8% drift over the period
                seasonal = seasonal_multiplier(current, peak_month)
                noise = 1.0 + random.uniform(-volatility, volatility)

                price = round(base_price * region_offset * drift * seasonal * noise, 2)
                quantity = int(random.uniform(200, 1500) * seasonal)  # more sold near peak season

                rows.append({
                    "date": current.isoformat(),
                    "crop": crop,
                    "region": region,
                    "pricePerKg": price,
                    "quantitySoldKg": quantity,
                })
                current += timedelta(days=DAYS_BETWEEN_SAMPLES)
    return rows


def main():
    rows = generate_rows()
    out_path = "data/mock_crop_prices.csv"
    with open(out_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "crop", "region", "pricePerKg", "quantitySoldKg"])
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} rows to {out_path}")
    print(f"Crops: {list(CROPS.keys())}")
    print(f"Regions: {REGIONS}")
    print(f"Date range: {START_DATE} to {END_DATE}, weekly samples")


if __name__ == "__main__":
    main()
