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


@app.get("/user/picks/{user_id}/{round}")
def get_user_picks(user_id: str, round: int):
    """
    Fetch user's picks for a specific race round.
    Returns pick data if exists, empty response otherwise.
    """
    try:
        supabase = get_supabase()

        # Don't use .single() — use .select() and check results manually
        picks_result = supabase.table("user_picks") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("year", 2026) \
            .eq("round", round) \
            .execute()

        if picks_result.data and len(picks_result.data) > 0:
            picks = picks_result.data[0]
            return {
                "exists": True,
                "id": picks.get("id"),
                "is_locked": picks.get("is_locked", False),
                "p1_pick": picks.get("p1_pick"),
                "p2_pick": picks.get("p2_pick"),
                "p3_pick": picks.get("p3_pick"),
                "rookie_pick": picks.get("rookie_pick"),
            }
        else:
            return {"exists": False}

    except Exception as e:
        print(f"[ERROR] Failed to fetch user picks: {e}")
        return {"exists": False, "error": str(e)}


@app.post("/user/picks/{user_id}/{round}")
def create_user_picks(user_id: str, round: int, pick_data: dict):
    """
    Create new picks for user for a race round.
    """
    try:
        supabase = get_supabase()

        race = get_upcoming_race()
        if not race:
            raise HTTPException(status_code=400, detail="No upcoming race found")

        insert_data = {
            "user_id": user_id,
            "race_name": race["name"],
            "year": 2026,
            "round": round,
            "p1_pick": pick_data.get("p1_pick"),
            "p2_pick": pick_data.get("p2_pick"),
            "p3_pick": pick_data.get("p3_pick"),
            "rookie_pick": pick_data.get("rookie_pick"),
            "is_locked": False,
        }

        result = supabase.table("user_picks").insert(insert_data).execute()

        if result.data:
            return {"success": True, "id": result.data[0].get("id")}
        else:
            raise HTTPException(status_code=500, detail="Failed to create picks")

    except Exception as e:
        print(f"[ERROR] Failed to create picks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/user/picks/{user_id}/{round}")
def update_user_picks(user_id: str, round: int, pick_data: dict):
    """
    Update existing picks for user for a race round.
    """
    try:
        supabase = get_supabase()

        # Fetch existing picks to get the ID
        existing_result = supabase.table("user_picks") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("year", 2026) \
            .eq("round", round) \
            .execute()

        if not existing_result.data or len(existing_result.data) == 0:
            raise HTTPException(status_code=404, detail="Picks not found")

        pick_id = existing_result.data[0]["id"]

        update_data = {
            "p1_pick": pick_data.get("p1_pick"),
            "p2_pick": pick_data.get("p2_pick"),
            "p3_pick": pick_data.get("p3_pick"),
            "rookie_pick": pick_data.get("rookie_pick"),
        }

        result = supabase.table("user_picks") \
            .update(update_data) \
            .eq("id", pick_id) \
            .execute()

        if result.data:
            return {"success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to update picks")

    except Exception as e:
        print(f"[ERROR] Failed to update picks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/user/picks/{user_id}/{round}/lock")
def lock_user_picks(user_id: str, round: int):
    """
    Lock picks after Qualifying starts/ends.
    """
    try:
        supabase = get_supabase()

        # Fetch existing picks to get the ID
        existing_result = supabase.table("user_picks") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("year", 2026) \
            .eq("round", round) \
            .execute()

        if not existing_result.data or len(existing_result.data) == 0:
            return {"success": False, "message": "Picks not found"}

        pick_id = existing_result.data[0]["id"]

        result = supabase.table("user_picks") \
            .update({"is_locked": True}) \
            .eq("id", pick_id) \
            .execute()

        if result.data:
            return {"success": True, "is_locked": True}
        else:
            return {"success": False, "message": "Failed to lock picks"}

    except Exception as e:
        print(f"[ERROR] Failed to lock picks: {e}")
        return {"success": False, "message": str(e)}