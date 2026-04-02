import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import BackendAlert from "./components/BackendAlert";
import Home from "./pages/Home";
import Standings from "./pages/Standings";
import RaceWeekend from "./pages/Raceweekend";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import AuthGuard from "./components/AuthGuard";
import MyPicks from "./pages/MyPicks";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    }
  }
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <BackendAlert />
      <div className="min-h-screen bg-black text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/race" element={<RaceWeekend />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/picks"
              element={
                <AuthGuard>
                  <MyPicks />
                </AuthGuard>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
    </QueryClientProvider>
  );
}
