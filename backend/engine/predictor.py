import pandas as pd
import numpy as np

from data.f1_fetcher import get_driver_standings, get_constructor_standings
from data.openf1_fetcher import get_session_by_name, get_session_pace_rankings

# Car performance scale bounds
CAR_SCORE_MIN = 60
CAR_SCORE_MAX = 95

# Pre-season baseline for teams with 0 championship points
PRESEASON_BASELINE = {
    "Williams": 63,
    "Cadillac F1 Team": 60,
    "Aston Martin": 62,
}

# Driver skill ratings based on 2025 performance and career stats
# Scale: 0-100
DRIVER_SKILL_2026 = {
    "HAM": 95, "VER": 95, "NOR": 90, "LEC": 94,
    "PIA": 86, "RUS": 85, "SAI": 84, "ALO": 83,
    "ANT": 78, "GAS": 76, "ALB": 75, "HUL": 74,
    "BEA": 72, "LAW": 71, "OCO": 70, "BOR": 69,
    "COL": 68, "HAD": 67, "LIN": 66, "STR": 65,
    "PER": 74, "BOT": 72,
}

# Track specialist bonuses — drivers who historically outperform at a circuit
TRACK_SPECIALISTS = {
    "Shanghai International Circuit": {
        "HAM": 5, "VER": 4, "LEC": 3
    },
}

# Session weights — how much each session influences the prediction
# Later sessions carry more weight as they are more representative
SESSION_WEIGHTS = {
    "Practice 1":        0.10,
    "Practice 2":        0.10,
    "Practice 3":        0.15,
    "Sprint Qualifying": 0.20,
    "Sprint":            0.25,
    "Qualifying":        0.45,
}

# All possible sessions in a race weekend in order
WEEKEND_SESSIONS = [
    "Practice 1",
    "Practice 2", 
    "Practice 3",
    "Sprint Qualifying",
    "Sprint",
    "Qualifying",
]

def get_dynamic_car_performance(year: int = 2026) -> dict:
    """
    Calculate car performance index dynamically
    from constructor championship standings.
    Leader gets CAR_SCORE_MAX, last place gets CAR_SCORE_MIN.
    Teams with 0 points use pre-season baseline estimates.
    """
    standings = get_constructor_standings(year)

    if not standings:
        print("[WARNING] Could not fetch constructor standings - using baseline")
        return PRESEASON_BASELINE

    points_list = [t["points"] for t in standings if t["points"] > 0]

    if not points_list:
        print("[WARNING] All teams have 0 points - using pre-season baseline")
        return PRESEASON_BASELINE

    max_points = max(points_list)
    min_points = min(points_list)
    points_range = max_points - min_points if max_points != min_points else 1

    car_performance = {}
    for team in standings:
        name = team["team"]
        points = team["points"]

        if points == 0:
            car_performance[name] = PRESEASON_BASELINE.get(name, CAR_SCORE_MIN)
        else:
            normalised = (points - min_points) / points_range
            score = CAR_SCORE_MIN + (normalised * (CAR_SCORE_MAX - CAR_SCORE_MIN))
            car_performance[name] = round(score, 1)

    return car_performance


def get_pace_score(driver_code: str, pace_rankings: list) -> float:
    """
    Convert session pace ranking into a 0-100 score.
    Blends track position with driver skill rating.
    P1 gets full score, last place gets progressively less.
    A skilled driver performing poorly gets more credit than
    an unskilled driver in the same position.
    """
    total = len(pace_rankings)
    if total == 0:
        return DRIVER_SKILL_2026.get(driver_code, 65)

    for driver in pace_rankings:
        if driver["driver_code"] == driver_code:
            position = driver["position"]

            # P1 = 100, last place = ~50
            pace_position_score = 100 - ((position - 1) / total) * 50

            # Blend 60% session pace with 40% driver skill
            skill = DRIVER_SKILL_2026.get(driver_code, 65)
            blended = (pace_position_score * 0.60) + (skill * 0.40)
            return round(blended, 2)

    # Driver did not set a lap time — fall back to skill rating
    return DRIVER_SKILL_2026.get(driver_code, 65)


def calculate_base_score(
    driver: dict,
    track: str,
    car_performance: dict
) -> float:
    """
    Calculate a driver's base score from static factors:
    - Car performance (25%)
    - Driver skill (20%)
    - Points momentum (10%)
    - Track specialist bonus (10%)
    """
    code = driver["driver"]
    team = driver["team"]
    points = driver["points"]

    # Car performance (25%) — dynamic from constructor standings
    car_score = car_performance.get(team, CAR_SCORE_MIN) * 0.25

    # Driver skill (20%)
    skill_score = DRIVER_SKILL_2026.get(code, 65) * 0.20

    # Points momentum (10%)
    max_points = 25
    momentum_score = min((points / max_points) * 100, 100) * 0.10

    # Track specialist bonus (10%)
    specialists = TRACK_SPECIALISTS.get(track, {})
    track_bonus = specialists.get(code, 0) * 0.10

    return car_score + skill_score + momentum_score + track_bonus


def scores_to_probabilities(scores: dict) -> dict:
    """Convert raw scores to win probabilities that sum to 100%"""
    total = sum(scores.values())
    return {
        driver: round((score / total) * 100, 1)
        for driver, score in scores.items()
    }


def generate_race_predictions(track: str, year: int = 2026) -> dict:
    """
    Baseline prediction using car performance, driver skill,
    points momentum and track specialists.
    Used when no session data is available yet.
    """
    standings = get_driver_standings(year)
    car_performance = get_dynamic_car_performance(year)

    raw_scores = {}
    for driver in standings:
        score = calculate_base_score(driver, track, car_performance)
        raw_scores[driver["driver"]] = {
            "score": score,
            "driver_name": driver["driver_name"],
            "team": driver["team"],
            "points": driver["points"]
        }

    score_values = {d: v["score"] for d, v in raw_scores.items()}
    win_probs = scores_to_probabilities(score_values)

    predictions = []
    for code, data in raw_scores.items():
        predictions.append({
            "driver_code": code,
            "driver_name": data["driver_name"],
            "team": data["team"],
            "championship_points": data["points"],
            "win_probability": win_probs[code],
            "base_score": round(data["score"], 2)
        })

    predictions.sort(key=lambda x: x["win_probability"], reverse=True)

    return {
        "track": track,
        "session_used": "baseline only",
        "year": year,
        "predictions": predictions
    }


def generate_race_predictions_with_session(
    track: str,
    session_name: str,
    location: str,
    year: int = 2026
) -> dict:
    """
    Full prediction blending all factors:
    - Car performance          (25%) dynamic from constructor standings
    - Driver skill             (20%) hardcoded ratings
    - Live session pace        (25%) from OpenF1
    - Points momentum          (10%) from driver standings
    - Track specialist bonus   (10%) historical performance
    - Pace vs skill alignment  (10%) outperforming expected position
    """
    standings = get_driver_standings(year)
    car_performance = get_dynamic_car_performance(year)

    session = get_session_by_name(session_name, location)
    pace_rankings = []
    session_available = False

    if session:
        pace_rankings = get_session_pace_rankings(session["session_key"])
        session_available = len(pace_rankings) > 0

    raw_scores = {}
    for driver in standings:
        code = driver["driver"]
        team = driver["team"]
        points = driver["points"]

        # 1. Car performance (25%)
        car_score = car_performance.get(team, CAR_SCORE_MIN) * 0.25

        # 2. Driver skill (20%)
        skill = DRIVER_SKILL_2026.get(code, 65)
        skill_score = skill * 0.20

        # 3. Points momentum (10%)
        max_points = 25
        momentum_score = min((points / max_points) * 100, 100) * 0.10

        # 4. Track specialist bonus (10%)
        specialists = TRACK_SPECIALISTS.get(track, {})
        track_bonus = specialists.get(code, 0) * 0.10

        if session_available:
            # 5. Live session pace blended with skill (25%)
            pace_score = get_pace_score(code, pace_rankings) * 0.25

            # 6. Pace vs skill alignment bonus (10%)
            # Rewards drivers outperforming their expected position
            raw_pace_position = next(
                (d["position"] for d in pace_rankings
                 if d["driver_code"] == code), None
            )
            if raw_pace_position and code in DRIVER_SKILL_2026:
                expected_position = sorted(
                    DRIVER_SKILL_2026.keys(),
                    key=lambda x: DRIVER_SKILL_2026[x],
                    reverse=True
                ).index(code) + 1
                alignment = max(0, expected_position - raw_pace_position)
                alignment_score = min(alignment * 2, 20) * 0.10
            else:
                alignment_score = 0

            total = (car_score + skill_score + momentum_score +
                     track_bonus + pace_score + alignment_score)
        else:
            total = car_score + skill_score + momentum_score + track_bonus

        raw_scores[code] = {
            "score": total,
            "driver_name": driver["driver_name"],
            "team": team,
            "points": points
        }

    score_values = {d: v["score"] for d, v in raw_scores.items()}
    win_probs = scores_to_probabilities(score_values)

    predictions = []
    for code, data in raw_scores.items():
        predictions.append({
            "driver_code": code,
            "driver_name": data["driver_name"],
            "team": data["team"],
            "championship_points": data["points"],
            "win_probability": win_probs[code],
            "base_score": round(data["score"], 2)
        })

    predictions.sort(key=lambda x: x["win_probability"], reverse=True)

    return {
        "track": track,
        "session_used": session_name if session_available else "baseline only",
        "year": year,
        "predictions": predictions
    }

def combine_session_pace_scores(
    driver_code: str,
    available_sessions: list
) -> float:
    """
    Combine pace scores across all available sessions
    using weighted average based on SESSION_WEIGHTS.
    Later sessions carry more weight.
    """
    total_weight = 0
    weighted_score = 0

    for session_name, pace_rankings in available_sessions:
        weight = SESSION_WEIGHTS.get(session_name, 0.10)
        pace = get_pace_score(driver_code, pace_rankings)
        weighted_score += pace * weight
        total_weight += weight

    if total_weight == 0:
        return DRIVER_SKILL_2026.get(driver_code, 65)

    return round(weighted_score / total_weight, 2)

def get_all_available_sessions(location: str) -> list:
    """
    Automatically fetch all sessions that have happened
    for a given race weekend location.
    Returns list of (session_name, pace_rankings) tuples
    for sessions that have data available.
    """
    import requests
    
    available = []
    
    response = requests.get(
        f"https://api.openf1.org/v1/sessions?year={2026}",
        timeout=10
    )
    all_sessions = response.json()
    
    if not isinstance(all_sessions, list):
        print("[WARNING] Could not fetch session list from OpenF1")
        return available
    
    # Filter to this race weekend and known session types
    weekend_sessions = [
        s for s in all_sessions
        if s.get("location") == location
        and s.get("session_name") in WEEKEND_SESSIONS
    ]
    
    # Sort by date so we process in order
    weekend_sessions.sort(key=lambda x: x.get("date_start", ""))
    
    for session in weekend_sessions:
        session_key = session.get("session_key")
        session_name = session.get("session_name")
        
        rankings = get_session_pace_rankings(session_key)
        
        if rankings:
            print(f"[INFO] Session available: {session_name} at {location} ({len(rankings)} drivers)")
            available.append((session_name, rankings))
        else:
            print(f"[INFO] No data yet for: {session_name} at {location}")
    
    return available

def generate_weekend_predictions(
    track: str,
    location: str,
    year: int = 2026
) -> dict:
    """
    Master prediction function.
    
    Automatically pulls ALL available session data for
    the race weekend and combines them into one prediction.
    Updates automatically as new sessions complete.
    
    Factor weights:
    - Car performance          (25%) dynamic from constructor standings
    - Driver skill             (20%) hardcoded ratings
    - Combined session pace    (25%) weighted average of all sessions
    - Points momentum          (10%) from driver standings
    - Track specialist bonus   (10%) historical performance
    - Pace vs skill alignment  (10%) outperforming expected position
    """
    standings = get_driver_standings(year)
    car_performance = get_dynamic_car_performance(year)

    # Pull all available sessions automatically
    available_sessions = get_all_available_sessions(location)
    session_available = len(available_sessions) > 0
    sessions_used = [s[0] for s in available_sessions]

    raw_scores = {}
    for driver in standings:
        code = driver["driver"]
        team = driver["team"]
        points = driver["points"]

        # 1. Car performance (25%)
        car_score = car_performance.get(team, CAR_SCORE_MIN) * 0.25

        # 2. Driver skill (20%)
        skill = DRIVER_SKILL_2026.get(code, 65)
        skill_score = skill * 0.20

        # 3. Points momentum (10%)
        max_points = 25
        momentum_score = min((points / max_points) * 100, 100) * 0.10

        # 4. Track specialist bonus (10%)
        specialists = TRACK_SPECIALISTS.get(track, {})
        track_bonus = specialists.get(code, 0) * 0.10

        if session_available:
            # 5. Combined session pace (25%)
            combined_pace = combine_session_pace_scores(
                code, available_sessions
            ) * 0.25

            # 6. Pace vs skill alignment bonus (10%)
            # Use the most recent session for alignment check
            latest_rankings = available_sessions[-1][1]
            raw_pace_position = next(
                (d["position"] for d in latest_rankings
                 if d["driver_code"] == code), None
            )
            if raw_pace_position and code in DRIVER_SKILL_2026:
                expected_position = sorted(
                    DRIVER_SKILL_2026.keys(),
                    key=lambda x: DRIVER_SKILL_2026[x],
                    reverse=True
                ).index(code) + 1
                alignment = max(0, expected_position - raw_pace_position)
                alignment_score = min(alignment * 2, 20) * 0.10
            else:
                alignment_score = 0

            total = (car_score + skill_score + momentum_score +
                     track_bonus + combined_pace + alignment_score)
        else:
            # No session data yet — baseline prediction only
            total = car_score + skill_score + momentum_score + track_bonus

        raw_scores[code] = {
            "score": total,
            "driver_name": driver["driver_name"],
            "team": team,
            "points": points
        }

    score_values = {d: v["score"] for d, v in raw_scores.items()}
    win_probs = scores_to_probabilities(score_values)

    predictions = []
    for code, data in raw_scores.items():
        predictions.append({
            "driver_code": code,
            "driver_name": data["driver_name"],
            "team": data["team"],
            "championship_points": data["points"],
            "win_probability": win_probs[code],
            "base_score": round(data["score"], 2)
        })

    predictions.sort(key=lambda x: x["win_probability"], reverse=True)

    return {
        "track": track,
        "location": location,
        "year": year,
        "sessions_used": sessions_used,
        "session_count": len(sessions_used),
        "predictions": predictions
    }