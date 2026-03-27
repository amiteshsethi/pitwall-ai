import requests
from typing import Optional

BASE_URL = "https://api.openf1.org/v1"
CURRENT_YEAR = 2026

# Known 2026 circuits to validate against
KNOWN_2026_CIRCUITS = [
    "Melbourne", "Shanghai", "Suzuka", "Sakhir", "Jeddah",
    "Miami", "Montreal", "Monaco", "Barcelona", "Spielberg",
    "Silverstone", "Spa", "Budapest", "Zandvoort", "Monza",
    "Madrid", "Baku", "Singapore", "Austin", "Mexico City",
    "Sao Paulo", "Las Vegas", "Lusail", "Yas Marina"
]


def safe_get(url: str) -> Optional[list]:
    """
    Safe API call — returns None instead of crashing
    if anything goes wrong
    """
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        if not isinstance(data, list) or len(data) == 0:
            return None

        return data

    except requests.exceptions.Timeout:
        print(f"[TIMEOUT] Failed to reach {url}")
        return None
    except requests.exceptions.ConnectionError:
        print(f"[CONNECTION ERROR] Could not reach {url}")
        return None
    except requests.exceptions.HTTPError as e:
        print(f"[HTTP ERROR] {e} - {url}")
        return None
    except Exception as e:
        print(f"[ERROR] Unexpected error calling {url}: {e}")
        return None

def get_latest_session() -> Optional[dict]:
    data = safe_get(f"{BASE_URL}/sessions?year={CURRENT_YEAR}")

    if data is None:
        print("[INFO] No 2026 session data available yet on OpenF1.")
        return None

    session = data[-1]

    # Validate year
    if session.get("year") != CURRENT_YEAR:
        print(f"[WARNING] Expected 2026 session but got {session.get('year')} - skipping.")
        return None

    # Validate it's a real 2026 location
    location = session.get("location", "")
    if not any(circuit in location for circuit in KNOWN_2026_CIRCUITS):
        print(f"[WARNING] Unrecognised 2026 location: {location} - skipping.")
        return None

    print(f"[INFO] Latest 2026 session: {session.get('session_name')} at {location}")
    return session

def get_live_lap_times(session_key: int) -> dict:
    """
    Get best lap time per driver for a session.
    Returns empty dict if no data — never crashes.
    """
    data = safe_get(f"{BASE_URL}/laps?session_key={session_key}")

    if data is None:
        return {}

    driver_best_laps = {}
    for lap in data:
        if not isinstance(lap, dict):
            continue

        driver = lap.get("driver_number")
        lap_duration = lap.get("lap_duration")

        if not driver or not lap_duration:
            continue
        if not isinstance(lap_duration, (int, float)):
            continue
        if lap_duration <= 0:
            continue

        if driver not in driver_best_laps:
            driver_best_laps[driver] = lap_duration
        elif lap_duration < driver_best_laps[driver]:
            driver_best_laps[driver] = lap_duration

    return driver_best_laps

def get_driver_info(session_key: int) -> dict:
    """
    Get driver details for a session.
    Returns empty dict if no data — never crashes.
    """
    data = safe_get(f"{BASE_URL}/drivers?session_key={session_key}")

    if data is None:
        return {}

    result = {}
    for d in data:
        if not isinstance(d, dict):
            continue
        number = d.get("driver_number")
        if not number:
            continue
        result[number] = {
            "code": d.get("name_acronym", f"D{number}"),
            "name": d.get("full_name", "Unknown"),
            "team": d.get("team_name", "Unknown"),
            "number": number
        }

    return result

def get_tyre_data(session_key: int) -> dict:
    """
    Get latest tyre compound per driver.
    Returns empty dict if no data — never crashes.
    """
    data = safe_get(f"{BASE_URL}/stints?session_key={session_key}")

    if data is None:
        return {}

    driver_tyres = {}
    for stint in data:
        if not isinstance(stint, dict):
            continue
        driver = stint.get("driver_number")
        compound = stint.get("compound")
        if driver and compound:
            driver_tyres[driver] = compound

    return driver_tyres

def get_session_pace_rankings(session_key: int) -> list:
    """
    Combine lap times + driver info into ranked pace list.
    Returns empty list cleanly if no data available.
    """
    lap_times = get_live_lap_times(session_key)

    if not lap_times:
        print("[INFO] No lap time data available for this session yet.")
        return []

    driver_info = get_driver_info(session_key)
    tyre_data = get_tyre_data(session_key)

    rankings = []
    for driver_number, best_lap in lap_times.items():
        info = driver_info.get(driver_number, {})
        rankings.append({
            "driver_number": driver_number,
            "driver_code": info.get("code", f"D{driver_number}"),
            "driver_name": info.get("name", "Unknown"),
            "team": info.get("team", "Unknown"),
            "best_lap_seconds": best_lap,
            "tyre_compound": tyre_data.get(driver_number, "Unknown"),
            "gap_to_leader": 0.0,
            "position": 0
        })

    rankings.sort(key=lambda x: x["best_lap_seconds"])

    leader_time = rankings[0]["best_lap_seconds"]
    for i, driver in enumerate(rankings):
        driver["position"] = i + 1
        driver["gap_to_leader"] = round(
            driver["best_lap_seconds"] - leader_time, 3
        )

    return rankings

def get_session_status() -> dict:
    """
    Returns current availability status of 2026 data.
    Used by the frontend to show the right message to fans.
    """
    session = get_latest_session()

    if session is None:
        return {
            "available": False,
            "message": "2026 session data not available yet. Check back during Chinese GP weekend.",
            "session": None
        }

    return {
        "available": True,
        "message": f"Live data available: {session.get('session_name')} at {session.get('location')}",
        "session": session
    }

def get_session_by_name(session_name: str, location: str) -> Optional[dict]:
    """
    Find a specific session by name and location.
    Example: get_session_by_name("Sprint Qualifying", "Shanghai")
    """
    data = safe_get(f"{BASE_URL}/sessions?year={CURRENT_YEAR}")

    if data is None:
        print("[INFO] No 2026 session data available yet.")
        return None

    for session in data:
        name_match = session_name.lower() in session.get("session_name", "").lower()
        location_match = location.lower() in session.get("location", "").lower()
        if name_match and location_match:
            return session

    print(f"[INFO] Session '{session_name}' at '{location}' not found yet.")
    return None