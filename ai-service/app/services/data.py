"""
Database access layer for AgriConnect (Read-Only).
Pulls historical listings, price history, and confirmed orders from PostgreSQL.
Gracefully handles database unavailability and falls back to mock / in-memory data.
"""

import os
import logging
from typing import List, Dict, Any, Optional
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:abhayyess@localhost:3006/agriconnect")

_engine = None

def get_db_engine():
    global _engine
    if _engine is None:
        try:
            # 2 second timeout for connection attempt to avoid hanging
            _engine = create_engine(
                DATABASE_URL,
                connect_args={"connect_timeout": 2},
                pool_pre_ping=True
            )
        except Exception as e:
            logger.warning(f"Could not initialize PostgreSQL engine: {e}")
            _engine = None
    return _engine


def get_farmer_crops(farmer_id: str) -> List[str]:
    """
    Fetch all unique crops listed by a specific farmer.
    """
    engine = get_db_engine()
    if not engine:
        return []

    query = text("""
        SELECT DISTINCT crop
        FROM listings
        WHERE farmer_id = :farmer_id
    """)
    try:
        with engine.connect() as conn:
            result = conn.execute(query, {"farmer_id": farmer_id})
            return [row[0] for row in result if row[0]]
    except Exception as e:
        logger.warning(f"Failed to query farmer crops from DB: {e}")
        return []


def get_crop_order_history(crop_name: Optional[str] = None) -> pd.DataFrame:
    """
    Fetch historical order records for crops from PostgreSQL.
    """
    engine = get_db_engine()
    if not engine:
        return pd.DataFrame()

    query_str = """
        SELECT
            o.created_at as order_date,
            l.crop,
            o.quantity,
            o.total_price,
            (o.total_price / NULLIF(o.quantity, 0)) as unit_price,
            o.status
        FROM orders o
        JOIN listings l ON o.listing_id = l.id
        WHERE o.status IN ('confirmed', 'shipped', 'delivered')
    """
    params = {}
    if crop_name:
        query_str += " AND LOWER(l.crop) = LOWER(:crop)"
        params["crop"] = crop_name

    query_str += " ORDER BY o.created_at ASC"

    try:
        with engine.connect() as conn:
            df = pd.read_sql_query(text(query_str), conn, params=params)
            return df
    except Exception as e:
        logger.warning(f"Failed to fetch order history from DB: {e}")
        return pd.DataFrame()


def get_crop_price_history(crop_name: Optional[str] = None) -> pd.DataFrame:
    """
    Fetch recorded price trends from price_history table.
    """
    engine = get_db_engine()
    if not engine:
        return pd.DataFrame()

    query_str = """
        SELECT
            crop,
            price,
            unit,
            recorded_at
        FROM price_history
    """
    params = {}
    if crop_name:
        query_str += " WHERE LOWER(crop) = LOWER(:crop)"
        params["crop"] = crop_name

    query_str += " ORDER BY recorded_at ASC"

    try:
        with engine.connect() as conn:
            df = pd.read_sql_query(text(query_str), conn, params=params)
            return df
    except Exception as e:
        logger.warning(f"Failed to fetch price history from DB: {e}")
        return pd.DataFrame()
