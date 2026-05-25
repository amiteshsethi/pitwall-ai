# pyrefly: ignore [missing-import]
import fastf1
import pandas as pd
import requests
import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

os.makedirs("fastf1_cache", exist_ok=True)
fastf1.Cache.enable_cache("fastf1_cache")

# Single source of truth for driver → team mapping
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


def get_session_data(year: int, race: str, session_type: str):
    """Fetch live session data from FastF1"""
    try:
        session = fastf1.get_session(year, race, session_type)
        session.load()
        laps = session.laps[["Driver", "LapTime", "Sector1Time",
                               "Sector2Time", "Sector3Time", "Compound"]]
        laps = laps.dropna(subset=["LapTime"])
        laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()
        return laps
    except Exception as e:
        print(f"Error fetching session data: {e}")
        return None


def get_driver_standings(year: int):
    """Fetch current driver championship standings via Jolpica API"""
    try:
        url = f"https://api.jolpi.ca/ergast/f1/{year}/driverStandings.json"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        standings = data["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"]
        result = []
        for s in standings:
            position = int(s["position"]) if s.get("position") else None
            result.append({
                "position": position,
                "driver": s["Driver"]["code"],
                "driver_name": f"{s['Driver']['givenName']} {s['Driver']['familyName']}",
                "points": float(s["points"]),
                "wins": int(s["wins"]),
                "team": s["Constructors"][0]["name"]
            })
        return result
    except Exception as e:
        print(f"[ERROR] Failed to fetch driver standings: {e}")
        return []


def get_upcoming_race():
    """Get the next race on the calendar"""
    from datetime import datetime, timezone, timedelta
    try:
        url = "https://api.jolpi.ca/ergast/f1/current.json"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        races = data["MRData"]["RaceTable"]["Races"]
        now = datetime.now(timezone.utc)
        for race in races:
            race_time = race.get("time", "15:00:00Z")
            race_datetime_str = f"{race['date']}T{race_time}"
            race_datetime = datetime.fromisoformat(
                race_datetime_str.replace("Z", "+00:00")
            )
            race_end = race_datetime + timedelta(hours=3)
            if race_end > now:
                return {
                    "name": race["raceName"],
                    "circuit": race["Circuit"]["circuitName"],
                    "country": race["Circuit"]["Location"]["country"],
                    "location": race["Circuit"]["Location"]["locality"],
                    "date": race["date"],
                    "time": race.get("time", ""),
                    "round": race["round"]
                }
        return None
    except Exception as e:
        print(f"[ERROR] Failed to fetch upcoming race: {e}")
        return None


def get_constructor_standings(year: int):
    """Fetch constructor championship standings via Jolpica API"""
    try:
        url = f"https://api.jolpi.ca/ergast/f1/{year}/constructorStandings.json"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        standings = data["MRData"]["StandingsTable"]["StandingsLists"][0]["ConstructorStandings"]
        return [
            {
                "position": int(s["position"]),
                "team": s["Constructor"]["name"],
                "points": float(s["points"]),
                "wins": int(s["wins"])
            }
            for s in standings
            if s.get("position")
        ]
    except Exception as e:
        print(f"[ERROR] Failed to fetch constructor standings: {e}")
        return []


def get_circuit_lap_record(circuit_id: str) -> dict:
    """Fetch current lap record for a circuit from Jolpica"""
    url = f"https://api.jolpi.ca/ergast/f1/circuits/{circuit_id}/fastest/1/results.json?limit=1"
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        races = data["MRData"]["RaceTable"]["Races"]
        if not races:
            return {}
        result = races[0]["Results"][0]
        return {
            "lap_record": result["FastestLap"]["Time"]["time"],
            "lap_record_driver": result["Driver"]["givenName"] + " " + result["Driver"]["familyName"],
            "lap_record_year": races[0]["season"],
            "team": result["Constructor"]["name"]
        }
    except Exception as e:
        print(f"[ERROR] Could not fetch lap record for {circuit_id}: {e}")
        return {}


def _parse_race_results(race: dict) -> dict:
    """
    Internal helper: parse a Jolpica race object into our standard format.
    Handles missing Constructors gracefully using DRIVER_TEAM_MAP fallback.
    """
    results = race.get("Results", [])
    top10 = []
    for r in results[:10]:
        constructors = r.get("Constructors", [])
        driver_code = r["Driver"]["code"]
        team = (
            constructors[0]["name"]
            if constructors
            else DRIVER_TEAM_MAP.get(driver_code, "Unknown")
        )
        top10.append({
            "position": int(r["position"]),
            "driver_code": driver_code,
            "driver_name": f"{r['Driver']['givenName']} {r['Driver']['familyName']}",
            "team": team,
        })
    return {
        "race_name": race["raceName"],
        "round": int(race["round"]),
        "date": race["date"],
        "top10": top10,
    }


def get_last_race_result(year: int) -> dict:
    """
    Fetch the most recent completed race result from Jolpica.

    FIX: Uses /current/last/results.json which always returns the most
    recently completed race, regardless of round number gaps caused by
    cancelled GPs. The old endpoint (?limit=50&offset=0) was returning
    the first round's results 50 times, not the last race.
    """
    try:
        url = f"https://api.jolpi.ca/ergast/f1/{year}/last/results.json"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        races = data["MRData"]["RaceTable"]["Races"]
        if not races:
            print(f"[INFO] No completed races found for {year} yet")
            return {}
        return _parse_race_results(races[0])
    except Exception as e:
        print(f"[ERROR] Failed to fetch last race result: {e}")
        return {}


def get_race_result_by_round(year: int, round: int) -> dict:
    """Fetch race result for a specific round"""
    try:
        url = f"https://api.jolpi.ca/ergast/f1/{year}/{round}/results.json"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        races = data["MRData"]["RaceTable"]["Races"]
        if not races:
            return {}
        return _parse_race_results(races[0])
    except Exception as e:
        print(f"[ERROR] Failed to fetch race result for round {round}: {e}")
        return {}


def get_all_completed_rounds(year: int) -> list[dict]:
    """
    Fetch all completed race rounds for the season.
    Returns list of {round, race_name} dicts, sorted by round.
    Used by the auto-scoring engine to find unscored races.
    """
    try:
        url = f"https://api.jolpi.ca/ergast/f1/{year}/results.json?limit=100"
        response = requests.get(url, timeout=15)
        response.raise_for_status()
        data = response.json()
        races = data["MRData"]["RaceTable"]["Races"]
        return [
            {"round": int(r["round"]), "race_name": r["raceName"]}
            for r in races
        ]
    except Exception as e:
        print(f"[ERROR] Failed to fetch completed rounds: {e}")
        return []