from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from engine.predictor import (
    generate_weekend_predictions,
    generate_race_predictions
)
from data.prediction_store import save_prediction, get_last_saved_prediction
from data.f1_fetcher import (
    get_upcoming_race,
    get_driver_standings,
    get_constructor_standings,
    get_circuit_lap_record,
    get_last_race_result
)
from data.supabase_client import get_supabase

from engine.scoring import calculate_and_save_scores, score_user_picks
from data.f1_fetcher import get_race_result_by_round

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
            status_code=503,
            detail="Race data temporarily unavailable — Jolpica API may be down. Try again shortly."
        )
    return race

@app.get("/predictions")
def predictions(track: str, location: str, year: int = 2026):
    """
    Main prediction endpoint.
    Automatically uses all available session data.
    Auto-saves prediction to Supabase after Qualifying.
    """
    if not track or not location:
        raise HTTPException(
            status_code=400,
            detail="track and location parameters are required"
        )

    result = generate_weekend_predictions(track, location, year)

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
def baseline_predictions(track: str, year: int = 2026):
    """Baseline prediction with no session data."""
    if not track:
        raise HTTPException(
            status_code=400,
            detail="track parameter is required"
        )
    return generate_race_predictions(track, year)


@app.get("/standings/drivers")
def driver_standings(year: int = 2026):
    standings = get_driver_standings(year)
    if not standings:
        raise HTTPException(status_code=404, detail="Could not fetch driver standings")
    return {"year": year, "standings": standings}


@app.get("/standings/constructors")
def constructor_standings(year: int = 2026):
    standings = get_constructor_standings(year)
    if not standings:
        raise HTTPException(status_code=404, detail="Could not fetch constructor standings")
    return {"year": year, "standings": standings}


@app.get("/sessions")
def available_sessions(location: str, year: int = 2026):
    import requests
    response = requests.get(
        f"https://api.openf1.org/v1/sessions?year={year}",
        timeout=10
    )
    all_sessions = response.json()

    if not isinstance(all_sessions, list):
        raise HTTPException(status_code=503, detail="Could not fetch session data from OpenF1")

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

    return {"location": location, "year": year, "sessions": weekend_sessions}


@app.get("/circuit/{circuit_id}/record")
def circuit_lap_record(circuit_id: str):
    return get_circuit_lap_record(circuit_id)


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
        actual_team = actual["team"]
        if actual_team == "Unknown":
            actual_team = driver_team_map.get(actual["driver_code"], "Unknown")

        predicted_team = predicted["team"] if predicted else "N/A"
        predicted_driver = predicted["driver_code"] if predicted else "N/A"

        comparison.append({
            "position": i + 1,
            "actual_driver": actual["driver_code"],
            "actual_team": actual_team,
            "predicted_driver": predicted_driver,
            "predicted_team": predicted_team,
            "driver_correct": predicted_driver == actual["driver_code"],
            "constructor_correct": predicted_team == actual_team,
        })

    return {
        "available": True,
        "round": last_result["round"], 
        "race_name": last_result["race_name"],
        "predicted_at": last_prediction["predicted_at"],
        "sessions_used": last_prediction["sessions_used"],
        "comparison": comparison,
        "driver_correct_count": sum(1 for c in comparison if c["driver_correct"]),
        "constructor_correct_count": sum(1 for c in comparison if c["constructor_correct"]),
        "total": len(comparison)
    }


@app.get("/user/stats/{user_id}")
def user_stats(user_id: str):
    try:
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
                "races_scored": 0,
                "best_race": None,
                "best_race_points": 0,
                "avg_points": 0,
                "streak": 0,
                "tagline": "Just getting started — submit your first picks!"
            }

        total_points = sum(s["total_points"] for s in scores.data)
        races_scored = len(scores.data)
        avg_points = round(total_points / races_scored, 1)
        best_race = max(scores.data, key=lambda x: x["total_points"])
        streak = len(picks.data)

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
    try:
        supabase = get_supabase()
        result = supabase.table("user_picks") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("year", 2026) \
            .eq("round", round) \
            .execute()

        if result.data and len(result.data) > 0:
            picks = result.data[0]
            return {
                "exists": True,
                "id": picks.get("id"),
                "is_locked": picks.get("is_locked", False),
                "p1_pick": picks.get("p1_pick"),
                "p2_pick": picks.get("p2_pick"),
                "p3_pick": picks.get("p3_pick"),
                "rookie_pick": picks.get("rookie_pick"),
            }
        return {"exists": False}

    except Exception as e:
        print(f"[ERROR] Failed to fetch user picks: {e}")
        return {"exists": False, "error": str(e)}


@app.post("/user/picks/{user_id}/{round}")
def create_user_picks(user_id: str, round: int, pick_data: dict):
    try:
        supabase = get_supabase()
        race = get_upcoming_race()
        if not race:
            raise HTTPException(status_code=400, detail="No upcoming race found")

        result = supabase.table("user_picks").insert({
            "user_id": user_id,
            "race_name": race["name"],
            "year": 2026,
            "round": round,
            "p1_pick": pick_data.get("p1_pick"),
            "p2_pick": pick_data.get("p2_pick"),
            "p3_pick": pick_data.get("p3_pick"),
            "rookie_pick": pick_data.get("rookie_pick"),
            "is_locked": False,
        }).execute()

        if result.data:
            return {"success": True, "id": result.data[0].get("id")}
        raise HTTPException(status_code=500, detail="Failed to create picks")

    except Exception as e:
        print(f"[ERROR] Failed to create picks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/user/picks/{user_id}/{round}")
def update_user_picks(user_id: str, round: int, pick_data: dict):
    try:
        supabase = get_supabase()
        existing = supabase.table("user_picks") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("year", 2026) \
            .eq("round", round) \
            .execute()

        if not existing.data:
            raise HTTPException(status_code=404, detail="Picks not found")

        result = supabase.table("user_picks") \
            .update({
                "p1_pick": pick_data.get("p1_pick"),
                "p2_pick": pick_data.get("p2_pick"),
                "p3_pick": pick_data.get("p3_pick"),
                "rookie_pick": pick_data.get("rookie_pick"),
            }) \
            .eq("id", existing.data[0]["id"]) \
            .execute()

        if result.data:
            return {"success": True}
        raise HTTPException(status_code=500, detail="Failed to update picks")

    except Exception as e:
        print(f"[ERROR] Failed to update picks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/user/picks/{user_id}/{round}/lock")
def lock_user_picks(user_id: str, round: int):
    try:
        supabase = get_supabase()
        existing = supabase.table("user_picks") \
            .select("id") \
            .eq("user_id", user_id) \
            .eq("year", 2026) \
            .eq("round", round) \
            .execute()

        if not existing.data:
            return {"success": False, "message": "Picks not found"}

        result = supabase.table("user_picks") \
            .update({"is_locked": True}) \
            .eq("id", existing.data[0]["id"]) \
            .execute()

        return {"success": bool(result.data), "is_locked": True}

    except Exception as e:
        print(f"[ERROR] Failed to lock picks: {e}")
        return {"success": False, "message": str(e)}

@app.post("/scores/calculate/{round}")
def calculate_scores(round: int, year: int = 2026):
    """
    Trigger scoring for all users for a specific round.
    Call this after race results are available.
    """
    result = calculate_and_save_scores(year, round)
    return result


@app.get("/scores/user/{user_id}")
def get_user_scores(user_id: str):
    """
    Fetch all scores for a user across the season.
    Includes breakdown per race.
    """
    try:
        supabase = get_supabase()
        scores = supabase.table("user_scores") \
            .select("*") \
            .eq("user_id", user_id) \
            .order("round", desc=False) \
            .execute()
        return {"scores": scores.data or []}
    except Exception as e:
        print(f"[ERROR] Failed to fetch scores: {e}")
        return {"scores": []}


@app.get("/scores/user/{user_id}/round/{round}")
def get_user_score_for_round(user_id: str, round: int, year: int = 2026):
    """
    Fetch score for a specific user and round.
    """
    try:
        supabase = get_supabase()
        result = supabase.table("user_scores") \
            .select("*") \
            .eq("user_id", user_id) \
            .eq("year", year) \
            .eq("round", round) \
            .execute()
        if result.data:
            return {"exists": True, "score": result.data[0]}
        return {"exists": False}
    except Exception as e:
        print(f"[ERROR] Failed to fetch score: {e}")
        return {"exists": False}

@app.get("/leaderboard/season")
def season_leaderboard(year: int = 2026):
    """
    Global season leaderboard — all users ranked by total points.
    Joins user_scores with profiles for username and avatar_url.
    """
    try:
        supabase = get_supabase()

        scores = supabase.table("user_scores") \
            .select("user_id, total_points, round, race_name") \
            .eq("year", year) \
            .execute()

        if not scores.data:
            return {"leaderboard": []}

        # Aggregate per user
        user_map: dict = {}
        for row in scores.data:
            uid = row["user_id"]
            if uid not in user_map:
                user_map[uid] = {"total_points": 0, "races_scored": 0}
            user_map[uid]["total_points"] += row["total_points"]
            user_map[uid]["races_scored"] += 1

        if not user_map:
            return {"leaderboard": []}

        # Fetch profiles for all user_ids in one query
        user_ids = list(user_map.keys())
        profiles = supabase.table("profiles") \
            .select("id, username, avatar_url") \
            .in_("id", user_ids) \
            .execute()

        profile_map = {p["id"]: p for p in (profiles.data or [])}

        leaderboard = []
        for uid, stats in user_map.items():
            profile = profile_map.get(uid, {})
            races = stats["races_scored"]
            total = stats["total_points"]
            leaderboard.append({
                "user_id": uid,
                "username": profile.get("username") or "Anonymous",
                "avatar_url": profile.get("avatar_url"),
                "total_points": total,
                "races_scored": races,
                "avg_points": round(total / races, 1) if races > 0 else 0,
            })

        leaderboard.sort(key=lambda x: x["total_points"], reverse=True)

        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1

        return {"year": year, "leaderboard": leaderboard}

    except Exception as e:
        print(f"[ERROR] Failed to fetch season leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch leaderboard")


@app.get("/leaderboard/race/{round}")
def race_leaderboard(round: int, year: int = 2026):
    """
    Per-race leaderboard — all users ranked by points for a specific round.
    Joins user_scores with user_picks and profiles.
    """
    try:
        supabase = get_supabase()

        scores = supabase.table("user_scores") \
            .select("user_id, total_points, actual_p1, actual_p2, actual_p3, race_name") \
            .eq("year", year) \
            .eq("round", round) \
            .execute()

        if not scores.data:
            return {"round": round, "leaderboard": []}

        user_ids = [row["user_id"] for row in scores.data]

        picks = supabase.table("user_picks") \
            .select("user_id, p1_pick, p2_pick, p3_pick, rookie_pick") \
            .eq("year", year) \
            .eq("round", round) \
            .in_("user_id", user_ids) \
            .execute()

        profiles = supabase.table("profiles") \
            .select("id, username, avatar_url") \
            .in_("id", user_ids) \
            .execute()

        picks_map = {p["user_id"]: p for p in (picks.data or [])}
        profile_map = {p["id"]: p for p in (profiles.data or [])}

        leaderboard = []
        for row in scores.data:
            uid = row["user_id"]
            profile = profile_map.get(uid, {})
            pick = picks_map.get(uid, {})
            leaderboard.append({
                "user_id": uid,
                "username": profile.get("username") or "Anonymous",
                "avatar_url": profile.get("avatar_url"),
                "total_points": row["total_points"],
                "race_name": row.get("race_name"),
                "p1_pick": pick.get("p1_pick"),
                "p2_pick": pick.get("p2_pick"),
                "p3_pick": pick.get("p3_pick"),
                "rookie_pick": pick.get("rookie_pick"),
                "actual_p1": row.get("actual_p1"),
                "actual_p2": row.get("actual_p2"),
                "actual_p3": row.get("actual_p3"),
            })

        leaderboard.sort(key=lambda x: x["total_points"], reverse=True)

        for i, entry in enumerate(leaderboard):
            entry["rank"] = i + 1

        return {"round": round, "year": year, "leaderboard": leaderboard}

    except Exception as e:
        print(f"[ERROR] Failed to fetch race leaderboard: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch race leaderboard")

@app.get("/leaderboard/scored-rounds")
def scored_rounds(year: int = 2026):
    try:
        supabase = get_supabase()
        result = supabase.table("user_scores") \
            .select("round, race_name") \
            .eq("year", year) \
            .order("round", desc=False) \
            .execute()

        if not result.data:
            return {"rounds": []}

        seen = set()
        rounds = []
        for row in result.data:
            r = row["round"]
            if r not in seen:
                seen.add(r)
                rounds.append({"round": r, "name": row.get("race_name") or f"Round {r}"})

        return {"year": year, "rounds": rounds}

    except Exception as e:
        print(f"[ERROR] Failed to fetch scored rounds: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch scored rounds")