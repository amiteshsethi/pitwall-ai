from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from engine.predictor import (
    generate_weekend_predictions,
    generate_race_predictions
)
from data.f1_fetcher import get_upcoming_race, get_driver_standings, get_constructor_standings

app = FastAPI(title="PitWall AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "PitWall AI API is running"}


@app.get("/upcoming-race")
def upcoming_race():
    race = get_upcoming_race()
    if not race:
        raise HTTPException(
            status_code=404,
            detail="No upcoming race found"
        )
    return race


@app.get("/predictions")
def predictions(
    track: str,
    location: str,
    year: int = 2026
):
    """
    Main prediction endpoint.
    Automatically uses all available session data
    for the given race weekend.
    """
    if not track or not location:
        raise HTTPException(
            status_code=400,
            detail="track and location parameters are required"
        )
    result = generate_weekend_predictions(track, location, year)
    return result


@app.get("/predictions/baseline")
def baseline_predictions(
    track: str,
    year: int = 2026
):
    """
    Baseline prediction with no session data.
    Used before any practice sessions have started.
    """
    if not track:
        raise HTTPException(
            status_code=400,
            detail="track parameter is required"
        )
    result = generate_race_predictions(track, year)
    return result


@app.get("/standings/drivers")
def driver_standings(year: int = 2026):
    """Current driver championship standings"""
    standings = get_driver_standings(year)
    if not standings:
        raise HTTPException(
            status_code=404,
            detail="Could not fetch driver standings"
        )
    return {"year": year, "standings": standings}


@app.get("/standings/constructors")
def constructor_standings(year: int = 2026):
    """Current constructor championship standings"""
    standings = get_constructor_standings(year)
    if not standings:
        raise HTTPException(
            status_code=404,
            detail="Could not fetch constructor standings"
        )
    return {"year": year, "standings": standings}


@app.get("/sessions")
def available_sessions(location: str, year: int = 2026):
    """
    List all sessions available for a race weekend location.
    Useful for the frontend to know which sessions have data.
    """
    import requests
    response = requests.get(
        f"https://api.openf1.org/v1/sessions?year={year}",
        timeout=10
    )
    all_sessions = response.json()

    if not isinstance(all_sessions, list):
        raise HTTPException(
            status_code=503,
            detail="Could not fetch session data from OpenF1"
        )

    weekend_sessions = [
        {
            "session_key": s.get("session_key"),
            "session_name": s.get("session_name"),
            "date_start": s.get("date_start"),
            "location": s.get("location"),
        }
        for s in all_sessions
        if s.get("location") == location
    ]

    return {
        "location": location,
        "year": year,
        "sessions": weekend_sessions
    }