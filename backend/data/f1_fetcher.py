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
    """Get the next race on the calendar via Jolpica API"""
    from datetime import datetime
    
    url = "https://api.jolpi.ca/ergast/f1/current.json"
    response = requests.get(url)
    data = response.json()
    races = data["MRData"]["RaceTable"]["Races"]
    
    today = datetime.now().date()
    
    for race in races:
        race_date = datetime.strptime(race["date"], "%Y-%m-%d").date()
        if race_date >= today:
            return {
                "name": race["raceName"],
                "circuit": race["Circuit"]["circuitName"],
                "country": race["Circuit"]["Location"]["country"],
                "date": race["date"],
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