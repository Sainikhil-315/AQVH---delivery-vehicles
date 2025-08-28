import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { useTheme } from './context/ThemeContext'
import { RoutingProvider } from './context/RoutingContext'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import ProblemSetup from './pages/ProblemSetup'
import Results from './pages/Results'
import History from './pages/History'

function App() {
  const { isDark } = useTheme()

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'dark bg-gray-900' : 'bg-gray-50'
    }`}>
      <RoutingProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/setup" element={<ProblemSetup />} />
              <Route path="/results" element={<Results />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </RoutingProvider>
    </div>
  )
}

export default App