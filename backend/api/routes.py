from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from engine.predictor import (
    generate_weekend_predictions,
    generate_race_predictions
)
from data.prediction_store import save_prediction, get_last_saved_prediction
from data.f1_fetcher import get_upcoming_race, get_driver_standings, get_constructor_standings ,get_circuit_lap_record,get_last_race_result

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


# @app.get("/predictions")
# def predictions(
#     track: str,
#     location: str,
#     year: int = 2026
# ):
#     """
#     Main prediction endpoint.
#     Automatically uses all available session data
#     for the given race weekend.
#     """
#     if not track or not location:
#         raise HTTPException(
#             status_code=400,
#             detail="track and location parameters are required"
#         )
#     result = generate_weekend_predictions(track, location, year)
    # return result

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
    Auto-saves prediction to Supabase after Qualifying.
    """
    if not track or not location:
        raise HTTPException(
            status_code=400,
            detail="track and location parameters are required"
        )

    result = generate_weekend_predictions(track, location, year)

    # Auto-save after Qualifying
    if result and result.get("predictions"):
        upcoming = get_upcoming_race()
        if upcoming:
            save_prediction(
                race_name=upcoming["name"],
                track=track,
                location=location,
                year=year,
                round=int(upcoming["round"]),
                sessions_used=result["sessions_used"],
                predictions=result["predictions"]
            )

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

@app.get("/circuit/{circuit_id}/record")
def circuit_lap_record(circuit_id: str):
    return get_circuit_lap_record(circuit_id)

@app.get("/predictions")
def predictions(track: str, location: str, year: int = 2026):
    result = generate_weekend_predictions(track, location, year)

    # Auto-save after Qualifying
    if result and result.get("predictions"):
        upcoming = get_upcoming_race()
        if upcoming:
            save_prediction(
                race_name=upcoming["name"],
                track=track,
                location=location,
                year=year,
                round=int(upcoming["round"]),
                sessions_used=result["sessions_used"],
                predictions=result["predictions"]
            )

    return result


@app.get("/comparison")
def prediction_comparison(year: int = 2026):
    """
    Returns last saved prediction vs actual race result.
    Used on Home page to show accuracy.
    """
    last_prediction = get_last_saved_prediction()
    if not last_prediction:
        return {"available": False}

    last_result = get_last_race_result(year)
    if not last_result:
        return {"available": False}

    # Only show comparison if the race in prediction has finished
    if last_prediction["round"] != last_result["round"]:
        return {"available": False}

    # Compare predicted podium vs actual top 3
    predicted_top3 = last_prediction["predicted_podium"][:3]
    actual_top3 = last_result["top10"][:3]

    comparison = []
    for i, actual in enumerate(actual_top3):
        predicted = predicted_top3[i] if i < len(predicted_top3) else None
        correct = predicted and predicted["driver_code"] == actual["driver_code"]
        comparison.append({
            "position": i + 1,
            "actual_driver": actual["driver_code"],
            "actual_team": actual["team"],
            "predicted_driver": predicted["driver_code"] if predicted else "N/A",
            "predicted_team": predicted["team"] if predicted else "N/A",
            "correct": correct
        })

    correct_count = sum(1 for c in comparison if c["correct"])

    return {
        "available": True,
        "race_name": last_result["race_name"],
        "predicted_at": last_prediction["predicted_at"],
        "sessions_used": last_prediction["sessions_used"],
        "comparison": comparison,
        "correct_count": correct_count,
        "total": len(comparison)
    }
