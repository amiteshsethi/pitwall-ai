import fastf1
import pandas as pd
import requests
import os
from dotenv import load_dotenv

load_dotenv()

# Enable FastF1 cache so we don't re-download data every time
os.makedirs("fastf1_cache", exist_ok=True)
fastf1.Cache.enable_cache("fastf1_cache")

def get_session_data(year: int, race: str, session_type: str):
    """
    Fetch live session data from FastF1
    session_type: 'FP1', 'FP2', 'FP3', 'Q', 'R'
    """
    try:
        session = fastf1.get_session(year, race, session_type)
        session.load()

        laps = session.laps[["Driver", "LapTime", "Sector1Time",
                               "Sector2Time", "Sector3Time", "Compound"]]
        laps = laps.dropna(subset=["LapTime"])

        # Convert lap times to seconds for maths
        laps["LapTimeSeconds"] = laps["LapTime"].dt.total_seconds()

        return laps

    except Exception as e:
        print(f"Error fetching session data: {e}")
        return None

def get_driver_standings(year: int):
    """Fetch current driver championship standings via Jolpica API"""
    url = f"https://api.jolpi.ca/ergast/f1/{year}/driverStandings.json"
    response = requests.get(url)
    data = response.json()
    
    standings = data["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"]
    
    result = []
    for s in standings:
        # Some drivers have no position (DNS/DNF) - handle gracefully
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

def get_upcoming_race():
    """Get the next race on the calendar"""
    from datetime import datetime, timezone
    
    url = "https://api.jolpi.ca/ergast/f1/current.json"
    response = requests.get(url)
    data = response.json()
    races = data["MRData"]["RaceTable"]["Races"]
    
    now = datetime.now(timezone.utc)
    
    for race in races:
        # Combine date + time for accurate comparison
        race_time = race.get("time", "15:00:00Z")
        race_datetime_str = f"{race['date']}T{race_time}"
        
        # Parse as UTC datetime
        race_datetime = datetime.fromisoformat(
            race_datetime_str.replace("Z", "+00:00")
        )
        
        # Add 3 hours buffer — race is ~2hrs, we want it gone after finish
        from datetime import timedelta
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
def get_constructor_standings(year: int):
    """Fetch constructor championship standings via Jolpica API"""
    url = f"https://api.jolpi.ca/ergast/f1/{year}/constructorStandings.json"
    response = requests.get(url)
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
            "lap_record_year": races[0]["season"]
        }
    except Exception as e:
        print(f"[ERROR] Could not fetch lap record for {circuit_id}: {e}")
        return {}

def get_last_race_result(year: int) -> dict:
    """Fetch the most recent race result from Jolpica"""
    try:
        url = f"https://api.jolpi.ca/ergast/f1/{year}/results.json?limit=50&offset=0"
        response = requests.get(url, timeout=10)
        data = response.json()

        races = data["MRData"]["RaceTable"]["Races"]
        if not races:
            return {}

        race = races[-1]
        results = race["Results"]

        top10 = []
        for r in results[:10]:
            constructors = r.get("Constructors", [])
            team = constructors[0]["name"] if constructors else "Unknown"
            top10.append({
                "position": int(r["position"]),
                "driver_code": r["Driver"]["code"],
                "driver_name": f"{r['Driver']['givenName']} {r['Driver']['familyName']}",
                "team": team,
            })

        return {
            "race_name": race["raceName"],
            "round": int(race["round"]),
            "date": race["date"],
            "top10": top10
        }

    except Exception as e:
        print(f"[ERROR] Failed to fetch last race result: {e}")
        return {}