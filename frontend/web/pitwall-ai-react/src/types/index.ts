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
  time: string
  location: string
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

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export interface CircuitInfo {
  name: string
  location: string
  country: string
  lapLengthKm: number
  totalLaps: number
  turns: number
  circuitId: string
}

export interface TrackVisualProps {
  circuitName: string
}

export interface LapRecord {
  lap_record: string
  lap_record_driver: string
  lap_record_year: string
}

export interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

export interface ComparisonItem {
  position: number
  actual_driver: string
  actual_team: string
  predicted_driver: string
  predicted_team: string
  correct: boolean
}

export interface PredictionComparison {
  available: boolean
  race_name?: string
  predicted_at?: string
  sessions_used?: string[]
  comparison?: ComparisonItem[]
  correct_count?: number
  total?: number
}