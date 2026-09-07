"""
AgriConnect AI Service
Author: Harsh (AI & Logistics Lead)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.routes import router as api_router

app = FastAPI(
    title="AgriConnect AI Service",
    description="Intelligent Demand Forecasting & Route Optimization for AgriConnect",
    version="1.0.0"
)

# CORS middleware for seamless integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include main API router
app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
