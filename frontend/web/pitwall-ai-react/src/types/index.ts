export interface Driver {
  driver_code: string
  driver_name: string
  team: string
  championship_points: number
  win_probability: number
  base_score: number
}

export interface Prediction {
  track: string
  location: string
  year: number
  sessions_used: string[]
  session_count: number
  predictions: Driver[]
}

export interface UpcomingRace {
  name: string
  circuit: string
  country: string
  date: string
  round: string
}

export interface DriverStanding {
  position: number
  driver: string
  driver_name: string
  points: number
  wins: number
  team: string
}

export interface ConstructorStanding {
  position: number
  team: string
  points: number
  wins: number
}