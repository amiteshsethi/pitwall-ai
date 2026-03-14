import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import RaceWeekends from './pages/Raceweekends'
import Standings from './pages/Standings'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-6xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/race" element={<RaceWeekends />} />
            <Route path="/standings" element={<Standings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}