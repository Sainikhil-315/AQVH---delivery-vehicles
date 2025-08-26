import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  Home, 
  Settings, 
  BarChart3, 
  History, 
  Zap,
  MapPin,
  Cpu
} from 'lucide-react'
import { clsx } from 'clsx'

const Sidebar = ({ isOpen = false, onClose }) => {
  const location = useLocation()

  const menuItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Settings, label: 'Problem Setup', path: '/setup' },
    { icon: BarChart3, label: 'Results', path: '/results' },
    { icon: History, label: 'History', path: '/history' }
  ]

  const quickActions = [
    { icon: Zap, label: 'Quick Quantum', action: 'quantum' },
    { icon: Cpu, label: 'Quick Classical', action: 'classical' },
    { icon: MapPin, label: 'Add Locations', action: 'locations' }
  ]

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-quantum-600" />
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                Navigation
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={clsx(
                    'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.action}
                    className="flex items-center space-x-3 w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 rounded-lg transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{action.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar