import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Standings from './pages/Standings'
import RaceWeekend from './pages/Raceweekend'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/race" element={<RaceWeekend />} />
            <Route path="/standings" element={<Standings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}