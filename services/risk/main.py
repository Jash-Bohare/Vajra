"""
FastAPI Microservice for RT-CFAS Risk Scoring (services/risk)
Internal HTTP microservice called by apps/api orchestrator
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import uvicorn

from rules import RiskScoreRequest, RiskScoreResponse, score_risk

app = FastAPI(
    title="RT-CFAS Risk Scoring Microservice",
    description="Rule-based risk indicator and feature extraction service for crypto fraud attribution",
    version="1.0.0",
)

# Restrict CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Internal service, called by apps/api
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "services/risk",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/risk/score", response_model=RiskScoreResponse)
def compute_risk_score(request: RiskScoreRequest):
    return score_risk(request)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
