export interface DriverPrediction {
  driver_code: string
  driver_name: string
  team: string
  win_probability: number
  position: number
}

export interface Prediction {
  predictions: DriverPrediction[]
  sessions_used: string[]
  session_count: number
  track: string
  location: string
}

export interface UpcomingRace {
  name: string
  circuit: string
  location: string
  country: string
  round: string
  date: string
  time: string
}

export interface DriverStanding {
  position: number
  driver_code: string
  driver_name: string
  team: string
  points: number
  wins: number
}

export interface ConstructorStanding {
  position: number
  team: string
  points: number
  wins: number
}

export interface UserPick {
  exists: boolean
  id?: string
  is_locked?: boolean
  p1_pick?: string
  p2_pick?: string
  p3_pick?: string
  rookie_pick?: string
}

export interface RaceScore {
  id: string
  round: number
  race_name: string
  total_points: number
  driver_points: number
  constructor_points: number
  rookie_points: number
  breakdown: Record<string, any>
  actual_p1?: string
  actual_p2?: string
  actual_p3?: string
  scored_at: string
}

export interface SeasonEntry {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  total_points: number
  races_scored: number
  avg_points: number
}

export interface RaceEntry {
  rank: number
  user_id: string
  username: string
  avatar_url: string | null
  total_points: number
  race_name: string | null
  p1_pick: string | null
  p2_pick: string | null
  p3_pick: string | null
  rookie_pick: string | null
  actual_p1: string | null
  actual_p2: string | null
  actual_p3: string | null
}