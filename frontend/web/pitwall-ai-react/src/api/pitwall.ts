import axios from 'axios'
import type { Prediction, UpcomingRace, DriverStanding, ConstructorStanding } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
})

export const getUpcomingRace = async (): Promise<UpcomingRace> => {
  const { data } = await api.get('/upcoming-race')
  return data
}

export const getWeekendPredictions = async (
  track: string,
  location: string,
  year: number = 2026
): Promise<Prediction> => {
  const { data } = await api.get('/predictions', {
    params: { track, location, year }
  })
  return data
}

export const getDriverStandings = async (
  year: number = 2026
): Promise<DriverStanding[]> => {
  const { data } = await api.get('/standings/drivers', {
    params: { year }
  })
  return data.standings
}

export const getConstructorStandings = async (
  year: number = 2026
): Promise<ConstructorStanding[]> => {
  const { data } = await api.get('/standings/constructors', {
    params: { year }
  })
  return data.standings
}

export const getCircuitLapRecord = async (circuitId: string) => {
  const { data } = await api.get(`/circuit/${circuitId}/record`)
  return data
}

export const getSessionStatus = async (location: string): Promise<{ session_count: number }> => {
  const { data } = await api.get('/predictions', {
    params: { 
      track: 'placeholder',
      location 
    }
  })
  return { session_count: data.session_count }
}

export const getPredictionComparison = async () => {
  const { data } = await api.get('/comparison')
  return data
}