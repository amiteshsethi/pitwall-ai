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
    last_prediction = get_last_saved_prediction()
    if not last_prediction:
        return {"available": False}

    last_result = get_last_race_result(year)
    if not last_result:
        return {"available": False}

    if last_prediction["round"] != last_result["round"]:
        return {"available": False}

    predicted_top3 = last_prediction["predicted_podium"][:3]
    actual_top3 = last_result["top10"][:3]

    # Driver code to team mapping as fallback for Unknown teams
    driver_team_map = {
        "ANT": "Mercedes", "RUS": "Mercedes",
        "HAM": "Ferrari", "LEC": "Ferrari",
        "NOR": "McLaren", "PIA": "McLaren",
        "VER": "Red Bull", "HAD": "Red Bull",
        "GAS": "Alpine F1 Team", "COL": "Alpine F1 Team",
        "ALB": "Williams", "SAI": "Williams",
        "BEA": "Haas F1 Team", "OCO": "Haas F1 Team",
        "LAW": "RB F1 Team", "LIN": "RB F1 Team",
        "HUL": "Audi", "BOR": "Audi",
        "PER": "Cadillac F1 Team", "BOT": "Cadillac F1 Team",
        "ALO": "Aston Martin", "STR": "Aston Martin",
    }

    comparison = []
    for i, actual in enumerate(actual_top3):
        predicted = predicted_top3[i] if i < len(predicted_top3) else None

        # Resolve actual team — use mapping if Unknown
        actual_team = actual["team"]
        if actual_team == "Unknown":
            actual_team = driver_team_map.get(actual["driver_code"], "Unknown")

        predicted_team = predicted["team"] if predicted else "N/A"
        predicted_driver = predicted["driver_code"] if predicted else "N/A"

        driver_correct = predicted_driver == actual["driver_code"]
        constructor_correct = predicted_team == actual_team

        comparison.append({
            "position": i + 1,
            "actual_driver": actual["driver_code"],
            "actual_team": actual_team,
            "predicted_driver": predicted_driver,
            "predicted_team": predicted_team,
            "driver_correct": driver_correct,
            "constructor_correct": constructor_correct,
        })

    driver_correct_count = sum(1 for c in comparison if c["driver_correct"])
    constructor_correct_count = sum(1 for c in comparison if c["constructor_correct"])

    return {
        "available": True,
        "race_name": last_result["race_name"],
        "predicted_at": last_prediction["predicted_at"],
        "sessions_used": last_prediction["sessions_used"],
        "comparison": comparison,
        "driver_correct_count": driver_correct_count,
        "constructor_correct_count": constructor_correct_count,
        "total": len(comparison)
    }

@app.get("/user/stats/{user_id}")
def user_stats(user_id: str):
    """
    Fetch user's season stats:
    - Total points
    - Races entered
    - Best race
    - Average points per race
    - Current streak
    """
    try:
        from data.supabase_client import get_supabase
        supabase = get_supabase()

        scores = supabase.table("user_scores") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("scored_at", desc=False) \
            .execute()

        picks = supabase.table("user_picks") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()

        if not scores.data:
            return {
                "total_points": 0,
                "races_entered": len(picks.data) if picks.data else 0,
                "best_race": None,
                "avg_points": 0,
                "streak": 0,
                "tagline": "Just getting started — submit your first picks!"
            }

        total_points = sum(s["total_points"] for s in scores.data)
        races_scored = len(scores.data)
        avg_points = round(total_points / races_scored, 1)
        best_race = max(scores.data, key=lambda x: x["total_points"])

        # Calculate streak — consecutive races with picks submitted
        streak = len(picks.data)

        # Dynamic tagline
        if total_points == 0:
            tagline = "Just getting started — submit your first picks!"
        elif avg_points > 30:
            tagline = "You're outpredicting most fans this season"
        elif avg_points > 20:
            tagline = "Solid predictions — keep it up"
        else:
            tagline = "Every race is a chance to beat the AI"

        return {
            "total_points": total_points,
            "races_entered": len(picks.data),
            "races_scored": races_scored,
            "best_race": best_race["race_name"],
            "best_race_points": best_race["total_points"],
            "avg_points": avg_points,
            "streak": streak,
            "tagline": tagline
        }

    except Exception as e:
        print(f"[ERROR] Failed to fetch user stats: {e}")
        return {
            "total_points": 0,
            "races_entered": 0,
            "races_scored": 0,
            "best_race": None,
            "best_race_points": 0,
            "avg_points": 0,
            "streak": 0,
            "tagline": "Just getting started — submit your first picks!"
        }