import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Moon, Sun, Zap, Menu } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import Button from '../ui/Button'

const Header = () => {
  const { isDark, toggleTheme } = useTheme()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/setup', label: 'Setup' },
    { path: '/results', label: 'Results' },
    { path: '/history', label: 'History' }
  ]

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="p-2 bg-gradient-to-r from-quantum-500 to-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-quantum-600 to-purple-600 bg-clip-text text-transparent">
              Quantum Fleet
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-950'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Theme Toggle */}
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2"
            >
              {isDark ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header