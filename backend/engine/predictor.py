import pandas as pd
import numpy as np
from data.f1_fetcher import get_driver_standings

# ── 2026 Car Performance Index ─────────────────────────────
# Based on pre-season testing data & technical regulations
# Scale: 0-100. Updated manually after each race weekend.
CAR_PERFORMANCE_2026 = {
    "Mercedes":         88,
    "Ferrari":          85,
    "McLaren":          84,
    "Red Bull":         80,
    "Aston Martin":     50,
    "Alpine F1 Team":   72,
    "Williams":         70,
    "Haas F1 Team":     69,
    "RB F1 Team":       68,
    "Audi":             65,
    "Cadillac F1 Team": 63,
}

# ── Driver Skill Ratings ───────────────────────────────────
# Based on 2025 performance, career stats, consistency
# Scale: 0-100
DRIVER_SKILL_2026 = {
    "HAM": 95, "VER": 95, "NOR": 90, "LEC": 94,
    "PIA": 86, "RUS": 85, "SAI": 84, "ALO": 83,
    "ANT": 78, "GAS": 76, "ALB": 75, "HUL": 74,
    "BEA": 72, "LAW": 71, "OCO": 70, "BOR": 69,
    "COL": 68, "HAD": 67, "LIN": 66, "STR": 65,
    "PER": 74, "BOT": 72,
}

# ── Track Specialist Bonuses ───────────────────────────────
# Some drivers historically outperform at specific circuits
TRACK_SPECIALISTS = {
    "Shanghai International Circuit": {
        "HAM": 5, "VER": 4, "LEC": 3
    },
    "default": {}
}

def calculate_base_score(driver: dict, track: str) -> float:
    """
    Calculate a driver's base score from:
    - Car performance (25%)
    - Driver skill (20%)
    - Championship points momentum (10%)
    - Track specialist bonus (5%)
    """
    code = driver["driver"]
    team = driver["team"]
    points = driver["points"]

    # Car performance score (25%)
    car_score = CAR_PERFORMANCE_2026.get(team, 60) * 0.25

    # Driver skill score (20%)
    skill_score = DRIVER_SKILL_2026.get(code, 65) * 0.20

    # Points momentum (10%) - normalised to 0-100
    max_points = 25  # max points from 1 race so far
    momentum_score = min((points / max_points) * 100, 100) * 0.10

    # Track specialist bonus (5%)
    specialists = TRACK_SPECIALISTS.get(track, {})
    track_bonus = specialists.get(code, 0) * 0.05

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
    Main prediction function — returns win probabilities
    and podium probabilities for all drivers
    """
    standings = get_driver_standings(year)

    # Calculate base score for each driver
    raw_scores = {}
    for driver in standings:
        score = calculate_base_score(driver, track)
        raw_scores[driver["driver"]] = {
            "score": score,
            "driver_name": driver["driver_name"],
            "team": driver["team"],
            "points": driver["points"]
        }

    # Win probabilities
    score_values = {d: v["score"] for d, v in raw_scores.items()}
    win_probs = scores_to_probabilities(score_values)

    # Build final output
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

    # Sort by win probability descending
    predictions.sort(key=lambda x: x["win_probability"], reverse=True)

    return {
        "track": track,
        "year": year,
        "predictions": predictions
    }