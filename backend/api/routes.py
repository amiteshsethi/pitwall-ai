from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from engine.predictor import (
    generate_weekend_predictions,
    generate_race_predictions
)
from data.prediction_store import save_prediction, get_last_saved_prediction, get_prediction_by_round
from data.f1_fetcher import (
    get_upcoming_race,
    get_driver_standings,
    get_constructor_standings,
    get_circuit_lap_record,
    get_last_race_result,
    get_race_result_by_round,
    DRIVER_TEAM_MAP,
)
from data.supabase_client import get_supabase
from engine.scoring import calculate_and_save_scores, score_user_picks, auto_score_missing_rounds

app = FastAPI(title="PitWall AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory prediction cache
# Preserves last known good prediction during OpenF1 live-session lockouts.
# Keyed by "{location}_{year}" so each race weekend has its own slot.
# Resets on server restart — that's fine, Render redeploys are infrequent.
# ---------------------------------------------------------------------------
_prediction_cache: dict = {}


@app.get("/")
def root():
    return {"message": "PitWall AI API is running"}


@app.get("/upcoming-race")
def upcoming_race():
    race = get_upcoming_race()
    if not race:
        raise HTTPException(
            status_code=503,
            detail="Race data temporarily unavailable — Jolpica API may be indexing results. Try again shortly."
        )
    return race


@app.get("/predictions")
def predictions(track: str, location: str, year: int = 2026):
    """
    Main prediction endpoint. Automatically uses all available session data.
    
    During OpenF1 live-session lockouts (401), returns the last cached
    prediction for this race weekend instead of dropping to baseline.
    Only saves to Supabase when we have real session data.
    """
    if not track or not location:
        raise HTTPException(
            status_code=400,
            detail="track and location parameters are required"
        )

    cache_key = f"{location}_{year}"
    result = generate_weekend_predictions(track, location, year)

    if result and result.get("predictions"):
        if result.get("session_count", 0) > 0:
            # Real session data — update cache and save to Supabase
            _prediction_cache[cache_key] = result
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
        elif cache_key in _prediction_cache:
            # OpenF1 returned nothing (live session lockout or no data yet)
            # Serve the last good prediction silently
            print(f"[INFO] No session data from OpenF1 — serving cached prediction for {location}")
            return _prediction_cache[cache_key]

    return result


@app.get("/predictions/baseline")
def baseline_predictions(track: str, year: int = 2026):
    """Baseline prediction with no session data."""
    if not track:
        raise HTTPException(status_code=400, detail="track parameter is required")
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
    try:
        response = requests.get(
            f"https://api.openf1.org/v1/sessions?year={year}",
            timeout=10
        )
        if response.status_code == 401:
            return {"location": location, "year": year, "sessions": [], "note": "OpenF1 restricted during live session"}
        response.raise_for_status()
        all_sessions = response.json()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not fetch session data from OpenF1: {e}")

    if not isinstance(all_sessions, list):
        raise HTTPException(status_code=503, detail="Unexpected response from OpenF1")

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
    """
    Returns AI prediction vs actual result for the most recently completed race.
    Wrapped in a full try/except so Jolpica indexing delays never cause a 500.
    """
    try:
        last_result = get_last_race_result(year)
        if not last_result or not last_result.get("top10"):
            return {"available": False, "reason": "Race results not yet indexed by Jolpica"}

        # Try to find a saved AI prediction for the most recent round
        prediction = get_prediction_by_round(year, last_result["round"])

        # Fallback: use the most recent saved prediction and pair with its round's result
        if not prediction:
            prediction = get_last_saved_prediction()
            if not prediction:
                return {"available": False, "reason": "No AI prediction saved yet"}
            last_result = get_race_result_by_round(year, prediction["round"])
            if not last_result or not last_result.get("top10"):
                return {"available": False, "reason": "Race result not yet available for predicted round"}

        predicted_top3 = prediction["predicted_podium"][:3]
        actual_top3 = last_result["top10"][:3]

        comparison = []
        for i, actual in enumerate(actual_top3):
            predicted = predicted_top3[i] if i < len(predicted_top3) else None
            actual_team = actual["team"]
            if actual_team == "Unknown":
                actual_team = DRIVER_TEAM_MAP.get(actual["driver_code"], "Unknown")

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
            "predicted_at": prediction["predicted_at"],
            "sessions_used": prediction["sessions_used"],
            "comparison": comparison,
            "driver_correct_count": sum(1 for c in comparison if c["driver_correct"]),
            "constructor_correct_count": sum(1 for c in comparison if c["constructor_correct"]),
            "total": len(comparison)
        }

    except Exception as e:
        print(f"[ERROR] Comparison endpoint failed: {e}")
        return {"available": False, "reason": "Temporarily unavailable — data still indexing"}


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
    """Manually trigger scoring for a specific round."""
    result = calculate_and_save_scores(year, round)
    return result


@app.get("/scores/auto-score")
def auto_score(year: int = 2026):
    """
    Self-healing endpoint: finds and scores all completed races with
    unscored picks. Safe to call any time — idempotent.
    """
    result = auto_score_missing_rounds(year)
    return result


@app.get("/scores/user/{user_id}")
def get_user_scores(user_id: str):
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
    try:
        supabase = get_supabase()
        scores = supabase.table("user_scores") \
            .select("user_id, total_points, round, race_name") \
            .eq("year", year) \
            .execute()
        if not scores.data:
            return {"leaderboard": []}

        user_map: dict = {}
        for row in scores.data:
            uid = row["user_id"]
            if uid not in user_map:
                user_map[uid] = {"total_points": 0, "races_scored": 0}
            user_map[uid]["total_points"] += row["total_points"]
            user_map[uid]["races_scored"] += 1

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

@app.get("/predictions/auto-save")
def auto_save_prediction(year: int = 2026):
    """
    Self-contained prediction saver — looks up the upcoming race internally
    so cron-job.org can hit a fixed URL with no changing parameters.
    """
    try:
        upcoming = get_upcoming_race()
        if not upcoming:
            return {"success": False, "reason": "No upcoming race found"}

        track = upcoming.get("circuit")
        location = upcoming.get("location")
        round_num = int(upcoming.get("round", 0))

        if not track or not location:
            return {"success": False, "reason": "Missing track or location"}

        result = generate_weekend_predictions(track, location, year)

        if result and result.get("predictions"):
            save_prediction(
                race_name=upcoming["name"],
                track=track,
                location=location,
                year=year,
                round=round_num,
                sessions_used=result["sessions_used"],
                predictions=result["predictions"]
            )
            return {
                "success": True,
                "race": upcoming["name"],
                "round": round_num,
                "sessions_used": result["sessions_used"],
                "session_count": result["session_count"]
            }

        return {"success": False, "reason": "No predictions generated"}

    except Exception as e:
        print(f"[ERROR] auto_save_prediction failed: {e}")
        return {"success": False, "reason": str(e)}