from data.supabase_client import get_supabase
from datetime import datetime

def save_prediction(
    race_name: str,
    track: str,
    location: str,
    year: int,
    round: int,
    sessions_used: list,
    predictions: list
) -> bool:
    """
    Save top 10 predictions to Supabase after Qualifying.
    Only saves if Qualifying is in sessions_used.
    """
    if "Qualifying" not in sessions_used:
        print("[INFO] Qualifying not done yet - skipping prediction save")
        return False

    try:
        supabase = get_supabase()

        # Check if prediction already exists for this round
        existing = supabase.table("predictions") \
            .select("id") \
            .eq("year", year) \
            .eq("round", round) \
            .execute()

        if existing.data:
            print(f"[INFO] Prediction for round {round} already saved - skipping")
            return False

        # Save top 10 predicted podium
        predicted_podium = [
            {
                "position": i + 1,
                "driver_code": p["driver_code"],
                "driver_name": p["driver_name"],
                "team": p["team"],
                "win_probability": p["win_probability"]
            }
            for i, p in enumerate(predictions[:10])
        ]

        supabase.table("predictions").insert({
            "race_name": race_name,
            "track": track,
            "location": location,
            "year": year,
            "round": round,
            "sessions_used": sessions_used,
            "predicted_podium": predicted_podium,
            "predicted_at": datetime.utcnow().isoformat()
        }).execute()

        print(f"[INFO] Prediction saved for {race_name} round {round}")
        return True

    except Exception as e:
        print(f"[ERROR] Failed to save prediction: {e}")
        return False


def get_last_saved_prediction() -> dict | None:
    """
    Fetch the most recently saved prediction from Supabase.
    """
    try:
        supabase = get_supabase()
        result = supabase.table("predictions") \
            .select("*") \
            .order("predicted_at", desc=True) \
            .limit(1) \
            .execute()

        if not result.data:
            return None

        return result.data[0]

    except Exception as e:
        print(f"[ERROR] Failed to fetch last prediction: {e}")
        return None