import math
from data.f1_fetcher import get_driver_standings, get_constructor_standings
from data.openf1_fetcher import get_session_by_name, get_session_pace_rankings

# ---------------------------------------------------------------------------
# Car performance scale
# ---------------------------------------------------------------------------
CAR_SCORE_MIN = 60
CAR_SCORE_MAX = 95

PRESEASON_BASELINE = {
    "Williams": 63,
    "Cadillac F1 Team": 60,
    "Aston Martin": 62,
}

# ---------------------------------------------------------------------------
# Driver skill ratings (2026 baseline, 0–100)
# ---------------------------------------------------------------------------
DRIVER_SKILL_2026 = {
    "HAM": 95, "VER": 95, "NOR": 90, "LEC": 94,
    "PIA": 86, "RUS": 85, "SAI": 84, "ALO": 83,
    "ANT": 78, "GAS": 76, "ALB": 75, "HUL": 74,
    "BEA": 72, "LAW": 71, "OCO": 70, "BOR": 69,
    "COL": 68, "HAD": 67, "LIN": 66, "STR": 65,
    "PER": 74, "BOT": 72,
}

# ---------------------------------------------------------------------------
# Circuit catalogue
#
# track_type controls two things:
#   1. softmax temperature  — lower = more separation between drivers
#   2. qualifying_multiplier — boosts the Qualifying session weight further
#      for circuits where pole is almost impossible to overturn (Monaco, Baku)
#
# Types:
#   "street"    — Monaco, Baku, Singapore, Las Vegas, Miami, Jeddah
#                 Overtaking near-impossible; qualifying position is destiny.
#                 Temperature 6 (sharp), quali multiplier 1.4×
#   "power"     — Monza, Spa, Silverstone, COTA, Interlagos
#                 Straights matter; engine+car dominates.
#                 Temperature 9 (moderate), quali multiplier 1.0×
#   "technical" — Hungary, Zandvoort, Suzuka, Bahrain
#                 Driver skill and setup matter most.
#                 Temperature 8 (default), quali multiplier 1.1×
#   "balanced"  — Everything else. Default.
#                 Temperature 8, quali multiplier 1.0×
# ---------------------------------------------------------------------------
CIRCUIT_TYPES: dict[str, dict] = {
    # Street circuits
    "Circuit de Monaco":            {"type": "street",    "temperature": 6,  "quali_multiplier": 1.4},
    "Baku City Circuit":            {"type": "street",    "temperature": 6,  "quali_multiplier": 1.4},
    "Marina Bay Street Circuit":    {"type": "street",    "temperature": 6,  "quali_multiplier": 1.4},
    "Las Vegas Strip Street Circuit": {"type": "street",  "temperature": 6,  "quali_multiplier": 1.4},
    "Miami International Autodrome": {"type": "street",   "temperature": 7,  "quali_multiplier": 1.2},
    "Jeddah Corniche Circuit":      {"type": "street",    "temperature": 7,  "quali_multiplier": 1.2},

    # Power circuits
    "Autodromo Nazionale Monza":    {"type": "power",     "temperature": 9,  "quali_multiplier": 1.0},
    "Circuit de Spa-Francorchamps": {"type": "power",     "temperature": 9,  "quali_multiplier": 1.0},
    "Silverstone Circuit":          {"type": "power",     "temperature": 9,  "quali_multiplier": 1.0},
    "Circuit of the Americas":      {"type": "power",     "temperature": 9,  "quali_multiplier": 1.0},
    "Autodromo Jose Carlos Pace":   {"type": "power",     "temperature": 9,  "quali_multiplier": 1.0},

    # Technical circuits
    "Hungaroring":                  {"type": "technical", "temperature": 8,  "quali_multiplier": 1.1},
    "Circuit Zandvoort":            {"type": "technical", "temperature": 8,  "quali_multiplier": 1.1},
    "Suzuka Circuit":               {"type": "technical", "temperature": 8,  "quali_multiplier": 1.1},
    "Bahrain International Circuit": {"type": "technical","temperature": 8,  "quali_multiplier": 1.1},
    "Shanghai International Circuit": {"type": "technical","temperature": 8, "quali_multiplier": 1.1},
}

DEFAULT_CIRCUIT = {"type": "balanced", "temperature": 8, "quali_multiplier": 1.0}

# ---------------------------------------------------------------------------
# Track specialist bonuses
# ---------------------------------------------------------------------------
TRACK_SPECIALISTS: dict[str, dict] = {
    "Shanghai International Circuit": {
        "HAM": 5, "VER": 4, "LEC": 3
    },
    "Circuit de Monaco": {
        "LEC": 6, "VER": 4, "ALO": 5, "HAM": 3
    },
    "Silverstone Circuit": {
        "HAM": 6, "NOR": 4, "RUS": 3
    },
    "Suzuka Circuit": {
        "VER": 5, "HAM": 4, "ALO": 3
    },
}

# ---------------------------------------------------------------------------
# Session weights — base values before circuit-type multiplier is applied
# ---------------------------------------------------------------------------
SESSION_WEIGHTS_BASE = {
    "Practice 1":        0.10,
    "Practice 2":        0.10,
    "Practice 3":        0.15,
    "Sprint Qualifying": 0.20,
    "Sprint":            0.25,
    "Qualifying":        0.45,
}

WEEKEND_SESSIONS = [
    "Practice 1", "Practice 2", "Practice 3",
    "Sprint Qualifying", "Sprint", "Qualifying",
]


def get_circuit_profile(track: str) -> dict:
    """Return circuit profile, falling back to balanced defaults."""
    return CIRCUIT_TYPES.get(track, DEFAULT_CIRCUIT)


def get_session_weights(track: str) -> dict:
    """
    Return session weights adjusted for circuit type.
    Street circuits boost Qualifying weight by its multiplier,
    redistributing the difference proportionally from practice sessions.
    """
    profile = get_circuit_profile(track)
    multiplier = profile["quali_multiplier"]

    weights = dict(SESSION_WEIGHTS_BASE)

    if multiplier != 1.0:
        base_quali = weights["Qualifying"]
        new_quali = min(base_quali * multiplier, 0.65)  # cap at 65%
        delta = new_quali - base_quali

        # Redistribute delta away from practice sessions proportionally
        practice_sessions = ["Practice 1", "Practice 2", "Practice 3"]
        practice_total = sum(weights[s] for s in practice_sessions)
        for s in practice_sessions:
            reduction = delta * (weights[s] / practice_total)
            weights[s] = max(weights[s] - reduction, 0.02)

        weights["Qualifying"] = new_quali

    return weights


# ---------------------------------------------------------------------------
# Probability conversion
# ---------------------------------------------------------------------------

def scores_to_probabilities(scores: dict, track: str) -> dict:
    """
    Convert raw scores to win probabilities using softmax.

    Temperature is circuit-aware:
    - Street circuits (Monaco, Baku): temperature=6 → sharper separation
      because overtaking is nearly impossible, qualifying position dominates
    - Power circuits (Monza, Spa): temperature=9 → flatter distribution
      because DRS + slipstream creates real race action
    - Technical/balanced: temperature=8 → default

    Lower temperature = more winner-takes-all. Higher = more even spread.
    """
    temperature = get_circuit_profile(track)["temperature"]

    exp_scores = {d: math.exp(s / temperature) for d, s in scores.items()}
    total = sum(exp_scores.values())
    return {
        driver: round((exp_val / total) * 100, 1)
        for driver, exp_val in exp_scores.items()
    }


# ---------------------------------------------------------------------------
# Dynamic car performance
# ---------------------------------------------------------------------------

def get_dynamic_car_performance(year: int = 2026) -> dict:
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


# ---------------------------------------------------------------------------
# Pace scoring
# ---------------------------------------------------------------------------

def get_pace_score(driver_code: str, pace_rankings: list) -> float:
    total = len(pace_rankings)
    if total == 0:
        return DRIVER_SKILL_2026.get(driver_code, 65)

    for driver in pace_rankings:
        if driver["driver_code"] == driver_code:
            position = driver["position"]
            pace_position_score = 100 - ((position - 1) / total) * 50
            skill = DRIVER_SKILL_2026.get(driver_code, 65)
            blended = (pace_position_score * 0.60) + (skill * 0.40)
            return round(blended, 2)

    return DRIVER_SKILL_2026.get(driver_code, 65)


# ---------------------------------------------------------------------------
# Baseline (no session data)
# ---------------------------------------------------------------------------

def generate_race_predictions(track: str, year: int = 2026) -> dict:
    standings = get_driver_standings(year)
    car_performance = get_dynamic_car_performance(year)

    raw_scores = {}
    for driver in standings:
        code = driver["driver"]
        team = driver["team"]
        points = driver["points"]

        car_score      = car_performance.get(team, CAR_SCORE_MIN) * 0.25
        skill_score    = DRIVER_SKILL_2026.get(code, 65) * 0.20
        momentum_score = min((points / 25) * 100, 100) * 0.10
        track_bonus    = TRACK_SPECIALISTS.get(track, {}).get(code, 0) * 0.10

        raw_scores[code] = {
            "score": car_score + skill_score + momentum_score + track_bonus,
            "driver_name": driver["driver_name"],
            "team": team,
            "points": points
        }

    score_values = {d: v["score"] for d, v in raw_scores.items()}
    win_probs = scores_to_probabilities(score_values, track)

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

    circuit_profile = get_circuit_profile(track)
    return {
        "track": track,
        "circuit_type": circuit_profile["type"],
        "session_used": "baseline only",
        "year": year,
        "predictions": predictions
    }


# ---------------------------------------------------------------------------
# Multi-session pace combiner
# ---------------------------------------------------------------------------

def combine_session_pace_scores(driver_code: str, available_sessions: list, track: str) -> float:
    """
    Combine pace scores across all available sessions using circuit-aware
    session weights. Qualifying gets a bigger boost on street circuits.
    """
    session_weights = get_session_weights(track)
    total_weight = 0
    weighted_score = 0

    for session_name, pace_rankings in available_sessions:
        weight = session_weights.get(session_name, 0.10)
        pace = get_pace_score(driver_code, pace_rankings)
        weighted_score += pace * weight
        total_weight += weight

    if total_weight == 0:
        return DRIVER_SKILL_2026.get(driver_code, 65)

    return round(weighted_score / total_weight, 2)


def get_all_available_sessions(location: str) -> list:
    """Fetch all completed sessions for a race weekend from OpenF1."""
    import requests

    available = []

    try:
        response = requests.get(
            f"https://api.openf1.org/v1/sessions?year=2026",
            timeout=10
        )
        # 401 = live session in progress, OpenF1 restricts access without paid key.
        # Return empty so the caller falls back to cache or baseline — don't crash.
        if response.status_code == 401:
            print("[INFO] OpenF1 restricted during live session — returning empty sessions")
            return available
        response.raise_for_status()
        all_sessions = response.json()
    except Exception as e:
        print(f"[WARNING] Could not fetch OpenF1 sessions: {e}")
        return available

    if not isinstance(all_sessions, list):
        print("[WARNING] Unexpected response format from OpenF1")
        return available

    weekend_sessions = [
        s for s in all_sessions
        if location.lower() in s.get("location", "").lower()
        and s.get("session_name") in WEEKEND_SESSIONS
    ]

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


# ---------------------------------------------------------------------------
# Master prediction function
# ---------------------------------------------------------------------------

def generate_weekend_predictions(track: str, location: str, year: int = 2026) -> dict:
    """
    Master prediction function.

    Automatically pulls ALL available session data and combines them.
    Circuit-aware in three ways:
      1. Qualifying weight is boosted for street/technical circuits
      2. Softmax temperature sharpens on street circuits (Monaco, Baku)
         so pole-sitter gets a meaningfully higher probability
      3. Track specialist bonuses are circuit-specific

    Factor weights (before circuit adjustment):
      Car performance          25% — dynamic from constructor standings
      Driver skill             20% — hardcoded ratings
      Combined session pace    25% — weighted avg of all sessions
      Points momentum          10% — from driver standings
      Track specialist bonus   10% — historical performance
      Pace vs skill alignment  10% — outperforming expected position
    """
    standings = get_driver_standings(year)
    car_performance = get_dynamic_car_performance(year)
    circuit_profile = get_circuit_profile(track)

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
        momentum_score = min((points / 25) * 100, 100) * 0.10

        # 4. Track specialist bonus (10%)
        track_bonus = TRACK_SPECIALISTS.get(track, {}).get(code, 0) * 0.10

        if session_available:
            # 5. Combined session pace (25%) — circuit-aware weights
            combined_pace = combine_session_pace_scores(
                code, available_sessions, track
            ) * 0.25

            # 6. Pace vs skill alignment bonus (10%)
            latest_rankings = available_sessions[-1][1]
            raw_pace_position = next(
                (d["position"] for d in latest_rankings if d["driver_code"] == code),
                None
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
            total = car_score + skill_score + momentum_score + track_bonus

        raw_scores[code] = {
            "score": total,
            "driver_name": driver["driver_name"],
            "team": team,
            "points": points
        }

    score_values = {d: v["score"] for d, v in raw_scores.items()}

    # Circuit-aware softmax: sharper separation at Monaco/Baku
    win_probs = scores_to_probabilities(score_values, track)

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
        "circuit_type": circuit_profile["type"],
        "year": year,
        "sessions_used": sessions_used,
        "session_count": len(sessions_used),
        "predictions": predictions
    }