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
# Multi-attribute driver model (2026 updated)
#
# How each attribute is used:
#   rtg         → base skill score (20% weight)
#   race_pace   → blended into session pace score (replaces rtg in pace calc)
#   experience  → scales momentum — veterans convert points more reliably
#   race_craft  → amplifies alignment bonus when outperforming expected pos
#   awareness   → dampens alignment penalty when underperforming
# ---------------------------------------------------------------------------
DRIVER_ATTRIBUTES_2026: dict[str, dict] = {
    "VER": {"rtg": 95, "experience": 88, "race_craft": 96, "awareness": 82, "race_pace": 97},
    "NOR": {"rtg": 94, "experience": 83, "race_craft": 93, "awareness": 82, "race_pace": 97},
    "RUS": {"rtg": 93, "experience": 83, "race_craft": 94, "awareness": 93, "race_pace": 94},
    "LEC": {"rtg": 92, "experience": 83, "race_craft": 92, "awareness": 91, "race_pace": 93},
    "HAM": {"rtg": 91, "experience": 98, "race_craft": 93, "awareness": 91, "race_pace": 89},
    "PIA": {"rtg": 91, "experience": 77, "race_craft": 95, "awareness": 81, "race_pace": 92},
    "ALO": {"rtg": 90, "experience": 99, "race_craft": 87, "awareness": 85, "race_pace": 91},
    "SAI": {"rtg": 86, "experience": 88, "race_craft": 88, "awareness": 80, "race_pace": 86},
    "ALB": {"rtg": 85, "experience": 84, "race_craft": 87, "awareness": 77, "race_pace": 85},
    "PER": {"rtg": 85, "experience": 92, "race_craft": 83, "awareness": 81, "race_pace": 85},
    "HUL": {"rtg": 85, "experience": 88, "race_craft": 85, "awareness": 85, "race_pace": 85},
    "GAS": {"rtg": 84, "experience": 83, "race_craft": 83, "awareness": 78, "race_pace": 85},
    "BOT": {"rtg": 84, "experience": 89, "race_craft": 75, "awareness": 95, "race_pace": 87},
    "OCO": {"rtg": 84, "experience": 83, "race_craft": 85, "awareness": 84, "race_pace": 84},
    "ANT": {"rtg": 83, "experience": 70, "race_craft": 83, "awareness": 75, "race_pace": 85},
    "HAD": {"rtg": 83, "experience": 71, "race_craft": 81, "awareness": 82, "race_pace": 85},
    "BEA": {"rtg": 83, "experience": 72, "race_craft": 88, "awareness": 70, "race_pace": 83},
    "BOR": {"rtg": 80, "experience": 69, "race_craft": 81, "awareness": 77, "race_pace": 81},
    "LAW": {"rtg": 79, "experience": 73, "race_craft": 79, "awareness": 71, "race_pace": 81},
    "STR": {"rtg": 77, "experience": 84, "race_craft": 77, "awareness": 73, "race_pace": 77},
    "COL": {"rtg": 73, "experience": 69, "race_craft": 71, "awareness": 74, "race_pace": 75},
    "LIN": {"rtg": 68, "experience": 32, "race_craft": 70, "awareness": 60, "race_pace": 72},
}

# Backwards-compatible — anything importing DRIVER_SKILL_2026 still works
DRIVER_SKILL_2026 = {code: attrs["rtg"] for code, attrs in DRIVER_ATTRIBUTES_2026.items()}


def _get_attr(driver_code: str, attr: str, fallback: int = 75) -> int:
    """Safe attribute lookup with fallback for unknown drivers."""
    return DRIVER_ATTRIBUTES_2026.get(driver_code, {}).get(attr, fallback)


# ---------------------------------------------------------------------------
# Circuit catalogue
# ---------------------------------------------------------------------------
CIRCUIT_TYPES: dict[str, dict] = {
    # Street circuits — overtaking near-impossible, qualifying is destiny
    "Circuit de Monaco":              {"type": "street",    "temperature": 6, "quali_multiplier": 1.4},
    "Baku City Circuit":              {"type": "street",    "temperature": 6, "quali_multiplier": 1.4},
    "Marina Bay Street Circuit":      {"type": "street",    "temperature": 6, "quali_multiplier": 1.4},
    "Las Vegas Strip Street Circuit": {"type": "street",    "temperature": 6, "quali_multiplier": 1.4},
    "Miami International Autodrome":  {"type": "street",    "temperature": 7, "quali_multiplier": 1.2},
    "Jeddah Corniche Circuit":        {"type": "street",    "temperature": 7, "quali_multiplier": 1.2},
    # Power circuits — straights + DRS create real race action
    "Autodromo Nazionale Monza":      {"type": "power",     "temperature": 9, "quali_multiplier": 1.0},
    "Circuit de Spa-Francorchamps":   {"type": "power",     "temperature": 9, "quali_multiplier": 1.0},
    "Silverstone Circuit":            {"type": "power",     "temperature": 9, "quali_multiplier": 1.0},
    "Circuit of the Americas":        {"type": "power",     "temperature": 9, "quali_multiplier": 1.0},
    "Autodromo Jose Carlos Pace":     {"type": "power",     "temperature": 9, "quali_multiplier": 1.0},
    # Technical circuits — driver skill and setup matter most
    "Hungaroring":                    {"type": "technical", "temperature": 8, "quali_multiplier": 1.1},
    "Circuit Zandvoort":              {"type": "technical", "temperature": 8, "quali_multiplier": 1.1},
    "Suzuka Circuit":                 {"type": "technical", "temperature": 8, "quali_multiplier": 1.1},
    "Bahrain International Circuit":  {"type": "technical", "temperature": 8, "quali_multiplier": 1.1},
    "Shanghai International Circuit": {"type": "technical", "temperature": 8, "quali_multiplier": 1.1},
}

DEFAULT_CIRCUIT = {"type": "balanced", "temperature": 8, "quali_multiplier": 1.0}

# ---------------------------------------------------------------------------
# Track specialist bonuses
# ---------------------------------------------------------------------------
TRACK_SPECIALISTS: dict[str, dict] = {
    "Shanghai International Circuit": {"HAM": 5, "VER": 4, "LEC": 3},
    "Circuit de Monaco":              {"LEC": 6, "VER": 4, "ALO": 5, "HAM": 3},
    "Silverstone Circuit":            {"HAM": 6, "NOR": 4, "RUS": 3},
    "Suzuka Circuit":                 {"VER": 5, "HAM": 4, "ALO": 3},
}

# ---------------------------------------------------------------------------
# Session weights — base values before circuit-type multiplier
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
    return CIRCUIT_TYPES.get(track, DEFAULT_CIRCUIT)


def get_session_weights(track: str) -> dict:
    """
    Session weights adjusted for circuit type.
    Street circuits boost Qualifying weight, redistributing from practice.
    """
    profile = get_circuit_profile(track)
    multiplier = profile["quali_multiplier"]
    weights = dict(SESSION_WEIGHTS_BASE)

    if multiplier != 1.0:
        base_quali = weights["Qualifying"]
        new_quali = min(base_quali * multiplier, 0.65)
        delta = new_quali - base_quali
        practice_sessions = ["Practice 1", "Practice 2", "Practice 3"]
        practice_total = sum(weights[s] for s in practice_sessions)
        for s in practice_sessions:
            weights[s] = max(weights[s] - delta * (weights[s] / practice_total), 0.02)
        weights["Qualifying"] = new_quali

    return weights


# ---------------------------------------------------------------------------
# Probability conversion — circuit-aware softmax
# ---------------------------------------------------------------------------
def scores_to_probabilities(scores: dict, track: str) -> dict:
    """
    Softmax with circuit-aware temperature.
    Street (temp=6): sharp separation — pole sitter dominates probability.
    Power (temp=9): flatter — DRS/slipstream keeps it open.
    """
    temperature = get_circuit_profile(track)["temperature"]
    exp_scores = {d: math.exp(s / temperature) for d, s in scores.items()}
    total = sum(exp_scores.values())
    return {d: round((v / total) * 100, 1) for d, v in exp_scores.items()}


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
# Pace scoring — uses race_pace attribute, not overall rtg
# ---------------------------------------------------------------------------
def get_pace_score(driver_code: str, pace_rankings: list) -> float:
    """
    Blends session position with race_pace attribute.
    NOR/VER (race_pace=97) correctly outscore HAM (race_pace=89) on pace
    even though overall RTG gap is smaller.
    """
    total = len(pace_rankings)
    if total == 0:
        return _get_attr(driver_code, "race_pace")

    for driver in pace_rankings:
        if driver["driver_code"] == driver_code:
            position = driver["position"]
            pace_position_score = 100 - ((position - 1) / total) * 50
            race_pace = _get_attr(driver_code, "race_pace")
            blended = (pace_position_score * 0.60) + (race_pace * 0.40)
            return round(blended, 2)

    return _get_attr(driver_code, "race_pace")


# ---------------------------------------------------------------------------
# Baseline prediction (no session data)
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
        skill_score    = _get_attr(code, "rtg") * 0.20
        exp_factor     = _get_attr(code, "experience") / 100
        momentum_score = min((points / 25) * 100, 100) * 0.10 * (0.5 + 0.5 * exp_factor)
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

    return {
        "track": track,
        "circuit_type": get_circuit_profile(track)["type"],
        "session_used": "baseline only",
        "year": year,
        "predictions": predictions
    }


# ---------------------------------------------------------------------------
# Multi-session pace combiner
# ---------------------------------------------------------------------------
def combine_session_pace_scores(driver_code: str, available_sessions: list, track: str) -> float:
    """
    Weighted average of pace scores across all available sessions.
    Uses circuit-aware weights so Qualifying counts more at Monaco/Baku.
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
        return _get_attr(driver_code, "race_pace")

    return round(weighted_score / total_weight, 2)


def get_all_available_sessions(location: str) -> list:
    """Fetch all completed sessions for a race weekend from OpenF1."""
    import requests

    available = []

    try:
        response = requests.get(
            "https://api.openf1.org/v1/sessions?year=2026",
            timeout=10
        )
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
    Master prediction function — multi-attribute driver model.

    Factor weights (before circuit adjustment):
      Car performance    25%  dynamic from constructor standings
      Driver skill RTG   20%  updated 2026 multi-attribute ratings
      Session pace       25%  race_pace weighted blend
      Points momentum    10%  experience-scaled (veterans convert better)
      Track specialist   10%  circuit-specific bonuses
      Alignment bonus    10%  race_craft/awareness weighted

    Circuit awareness:
      - Qualifying weight boosted for street circuits (Monaco 63%, Baku 63%)
      - Softmax temperature lowers at street circuits → sharper separation
      - Track specialists applied per circuit
    """
    standings = get_driver_standings(year)
    car_performance = get_dynamic_car_performance(year)
    circuit_profile = get_circuit_profile(track)

    available_sessions = get_all_available_sessions(location)
    session_available = len(available_sessions) > 0
    sessions_used = [s[0] for s in available_sessions]

    # Pre-sort by RTG once outside the driver loop — used for alignment calc
    rtg_sorted = sorted(
        DRIVER_ATTRIBUTES_2026.keys(),
        key=lambda x: DRIVER_ATTRIBUTES_2026[x]["rtg"],
        reverse=True
    )

    raw_scores = {}
    for driver in standings:
        code = driver["driver"]
        team = driver["team"]
        points = driver["points"]

        # 1. Car performance (25%)
        car_score = car_performance.get(team, CAR_SCORE_MIN) * 0.25

        # 2. Driver skill — RTG (20%)
        skill_score = _get_attr(code, "rtg") * 0.20

        # 3. Points momentum (10%) — experience-scaled
        # exp_factor 0.5–1.0: rookies get half momentum credit, veterans full
        exp_factor = _get_attr(code, "experience") / 100
        momentum_score = min((points / 25) * 100, 100) * 0.10 * (0.5 + 0.5 * exp_factor)

        # 4. Track specialist bonus (10%)
        track_bonus = TRACK_SPECIALISTS.get(track, {}).get(code, 0) * 0.10

        if session_available:
            # 5. Combined session pace (25%) — race_pace weighted
            combined_pace = combine_session_pace_scores(
                code, available_sessions, track
            ) * 0.25

            # 6. Pace vs skill alignment bonus (10%)
            # Uses latest session for the position check
            latest_rankings = available_sessions[-1][1]
            raw_pace_position = next(
                (d["position"] for d in latest_rankings if d["driver_code"] == code),
                None
            )

            if raw_pace_position and code in DRIVER_ATTRIBUTES_2026:
                expected_position = rtg_sorted.index(code) + 1 if code in rtg_sorted else 11
                positions_gained = expected_position - raw_pace_position

                if positions_gained > 0:
                    # Outperforming expected position: race_craft amplifies bonus
                    craft_factor = _get_attr(code, "race_craft") / 100
                    alignment_score = min(positions_gained * 2, 20) * 0.10 * craft_factor
                else:
                    # Underperforming: awareness dampens the penalty
                    awareness_factor = _get_attr(code, "awareness") / 100
                    alignment_score = max(positions_gained * 2, -10) * 0.10 * (1 - awareness_factor * 0.5)
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