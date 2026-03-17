import { useEffect, useState } from 'react'
import type { TimeLeft } from '../types'


export function useCountDownFn(date: string | null, time: string | null): TimeLeft {
  const calculate = (): TimeLeft => {
    if (!date) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    const target = time ? new Date(`${date}T${time}`) : new Date(date)
    const diff = target.getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60),
    }
  }

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculate)

  useEffect(() => {
    if (!date) return
    const timer = setInterval(() => setTimeLeft(calculate()), 1000)
    return () => clearInterval(timer)
  }, [date, time])

  return timeLeft
}