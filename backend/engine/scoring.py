from data.supabase_client import get_supabase
from data.f1_fetcher import get_race_result_by_round

ROOKIES_2026 = {"ANT", "HAD", "LIN", "BOR", "BEA", "COL"}

SCORING = {
    "exact_p1": 25,
    "exact_p2": 18,
    "exact_p3": 15,
    "constructor_p1": 10,
    "constructor_p2": 7,
    "constructor_p3": 5,
    "any_podium_wrong_pos": 3,
    "rookie_correct": 15,
}

DRIVER_TEAM_MAP = {
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


def score_user_picks(picks: dict, result: dict) -> dict:
    """
    Score a user's picks against the actual race result.
    Returns breakdown and total points.
    """
    top3 = result.get("top10", [])[:3]
    if not top3:
        return {}

    actual_p1 = top3[0]["driver_code"]
    actual_p2 = top3[1]["driver_code"]
    actual_p3 = top3[2]["driver_code"]
    actual_podium = {actual_p1, actual_p2, actual_p3}

    actual_p1_team = DRIVER_TEAM_MAP.get(actual_p1, top3[0].get("team", "Unknown"))
    actual_p2_team = DRIVER_TEAM_MAP.get(actual_p2, top3[1].get("team", "Unknown"))
    actual_p3_team = DRIVER_TEAM_MAP.get(actual_p3, top3[2].get("team", "Unknown"))

    user_p1 = picks.get("p1_pick", "")
    user_p2 = picks.get("p2_pick", "")
    user_p3 = picks.get("p3_pick", "")
    user_rookie = picks.get("rookie_pick", "")

    driver_points = 0
    constructor_points = 0
    breakdown = []

    # P1 scoring
    if user_p1 == actual_p1:
        driver_points += SCORING["exact_p1"]
        breakdown.append({"pick": user_p1, "position": 1, "result": "correct", "points": SCORING["exact_p1"], "reason": "Exact P1"})
    elif user_p1 in actual_podium:
        driver_points += SCORING["any_podium_wrong_pos"]
        breakdown.append({"pick": user_p1, "position": 1, "result": "podium", "points": SCORING["any_podium_wrong_pos"], "reason": "On podium, wrong position"})
    else:
        breakdown.append({"pick": user_p1, "position": 1, "result": "wrong", "points": 0, "reason": "Not on podium"})

    if DRIVER_TEAM_MAP.get(user_p1) == actual_p1_team:
        constructor_points += SCORING["constructor_p1"]
        breakdown.append({"pick": user_p1, "position": 1, "result": "constructor_correct", "points": SCORING["constructor_p1"], "reason": "Correct constructor P1"})

    # P2 scoring
    if user_p2 == actual_p2:
        driver_points += SCORING["exact_p2"]
        breakdown.append({"pick": user_p2, "position": 2, "result": "correct", "points": SCORING["exact_p2"], "reason": "Exact P2"})
    elif user_p2 in actual_podium:
        driver_points += SCORING["any_podium_wrong_pos"]
        breakdown.append({"pick": user_p2, "position": 2, "result": "podium", "points": SCORING["any_podium_wrong_pos"], "reason": "On podium, wrong position"})
    else:
        breakdown.append({"pick": user_p2, "position": 2, "result": "wrong", "points": 0, "reason": "Not on podium"})

    if DRIVER_TEAM_MAP.get(user_p2) == actual_p2_team:
        constructor_points += SCORING["constructor_p2"]
        breakdown.append({"pick": user_p2, "position": 2, "result": "constructor_correct", "points": SCORING["constructor_p2"], "reason": "Correct constructor P2"})

    # P3 scoring
    if user_p3 == actual_p3:
        driver_points += SCORING["exact_p3"]
        breakdown.append({"pick": user_p3, "position": 3, "result": "correct", "points": SCORING["exact_p3"], "reason": "Exact P3"})
    elif user_p3 in actual_podium:
        driver_points += SCORING["any_podium_wrong_pos"]
        breakdown.append({"pick": user_p3, "position": 3, "result": "podium", "points": SCORING["any_podium_wrong_pos"], "reason": "On podium, wrong position"})
    else:
        breakdown.append({"pick": user_p3, "position": 3, "result": "wrong", "points": 0, "reason": "Not on podium"})

    if DRIVER_TEAM_MAP.get(user_p3) == actual_p3_team:
        constructor_points += SCORING["constructor_p3"]
        breakdown.append({"pick": user_p3, "position": 3, "result": "constructor_correct", "points": SCORING["constructor_p3"], "reason": "Correct constructor P3"})

    # Rookie scoring
    rookie_points = 0
    if user_rookie:
        rookie_top = next(
            (d["driver_code"] for d in result.get("top10", [])
             if d["driver_code"] in ROOKIES_2026),
            None
        )
        if user_rookie == rookie_top:
            rookie_points = SCORING["rookie_correct"]
            breakdown.append({"pick": user_rookie, "position": None, "result": "rookie_correct", "points": rookie_points, "reason": "Correct top rookie"})
        else:
            breakdown.append({"pick": user_rookie, "position": None, "result": "rookie_wrong", "points": 0, "reason": "Wrong top rookie"})

    total = driver_points + constructor_points + rookie_points

    return {
        "driver_points": driver_points,
        "constructor_points": constructor_points,
        "rookie_points": rookie_points,
        "total_points": total,
        "breakdown": breakdown,
        "actual_p1": actual_p1,
        "actual_p2": actual_p2,
        "actual_p3": actual_p3,
    }


def calculate_and_save_scores(year: int, round: int) -> dict:
    """
    Fetch all user picks for a race round,
    score them and save to user_scores table.
    """
    supabase = get_supabase()
    result = get_race_result_by_round(year, round)

    if not result or not result.get("top10"):
        return {"success": False, "message": "Race result not available yet"}

    picks_result = supabase.table("user_picks") \
        .select("*") \
        .eq("year", year) \
        .eq("round", round) \
        .execute()

    if not picks_result.data:
        return {"success": False, "message": "No picks found for this round"}

    scored_count = 0
    for pick in picks_result.data:
        score = score_user_picks(pick, result)
        if not score:
            continue

        # Check if already scored
        existing = supabase.table("user_scores") \
            .select("id") \
            .eq("user_id", pick["user_id"]) \
            .eq("year", year) \
            .eq("round", round) \
            .execute()

        score_data = {
            "user_id": pick["user_id"],
            "race_name": result["race_name"],
            "year": year,
            "round": round,
            "driver_points": score["driver_points"],
            "constructor_points": score["constructor_points"],
            "rookie_points": score.get("rookie_points", 0),
            "total_points": score["total_points"],
            "breakdown": score["breakdown"],
            "actual_p1": score["actual_p1"],
            "actual_p2": score["actual_p2"],
            "actual_p3": score["actual_p3"],
        }

        if existing.data:
            supabase.table("user_scores") \
                .update(score_data) \
                .eq("id", existing.data[0]["id"]) \
                .execute()
        else:
            supabase.table("user_scores") \
                .insert(score_data) \
                .execute()

        scored_count += 1
        print(f"[INFO] Scored {pick['user_id']} for round {round}: {score['total_points']} pts")

    return {"success": True, "scored": scored_count, "race": result["race_name"]}