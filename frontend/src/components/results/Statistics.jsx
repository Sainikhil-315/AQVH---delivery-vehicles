import React from 'react'
import { BarChart3, Clock, Target, Zap } from 'lucide-react'
import Card from '../ui/Card'
import PerformanceChart from '../visualization/PerformanceChart'

const Statistics = ({ results }) => {
  if (!results) return null

  const {
    cost,
    executionTime,
    iterations,
    qubits,
    algorithm,
    routes = [],
    convergence = []
  } = results

  const stats = [
    {
      label: 'Total Cost',
      value: `${cost?.toFixed(2) || 'N/A'}`,
      icon: Target,
      color: 'text-blue-600'
    },
    {
      label: 'Execution Time',
      value: executionTime ? `${executionTime.toFixed(2)}s` : 'N/A',
      icon: Clock,
      color: 'text-green-600'
    },
    {
      label: 'Iterations',
      value: iterations || 'N/A',
      icon: BarChart3,
      color: 'text-yellow-600'
    },
    ...(qubits ? [{
      label: 'Qubits Used',
      value: qubits,
      icon: Zap,
      color: 'text-quantum-600'
    }] : [])
  ]

  const routeStats = routes.map((route, index) => ({
    algorithm: `Route ${index + 1}`,
    cost: route.length * 2.5 + Math.random() * 3,
    executionTime: 0,
    value: route.length
  }))

  return (
    <div className="space-y-6">
      {/* Key Statistics */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-medium">Performance Statistics</h3>
        </Card.Header>
        
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex justify-center mb-2">
                    <Icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              )
            })}
          </div>
        </Card.Content>
      </Card>

      {/* Route Distribution */}
      {routes.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Route Distribution</h3>
          </Card.Header>
          
          <Card.Content>
            <PerformanceChart 
              data={routeStats}
              type="bar"
              className="h-64"
            />
          </Card.Content>
        </Card>
      )}

      {/* Algorithm Details */}
      <Card>
        <Card.Header>
          <h3 className="text-lg font-medium">Algorithm Details</h3>
        </Card.Header>
        
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Configuration
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Algorithm:</span>
                  <span className="font-medium">{algorithm}</span>
                </div>
                {qubits && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Qubits:</span>
                    <span className="font-medium">{qubits}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Vehicles:</span>
                  <span className="font-medium">{routes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Customers:</span>
                  <span className="font-medium">
                    {routes.reduce((total, route) => total + route.filter(loc => loc !== 0).length, 0)}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Performance Metrics
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Avg Route Length:</span>
                  <span className="font-medium">
                    {routes.length > 0 ? (cost / routes.length).toFixed(2) : 'N/A'} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Time per iteration:</span>
                  <span className="font-medium">
                    {iterations && executionTime ? (executionTime / iterations * 1000).toFixed(0) + 'ms' : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Solution Quality:</span>
                  <span className="font-medium text-green-600">
                    {cost < 20 ? 'Excellent' : cost < 40 ? 'Good' : 'Fair'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Convergence:</span>
                  <span className="font-medium">
                    {convergence.length > 0 ? 'Available' : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Convergence Chart */}
      {convergence.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Convergence Analysis</h3>
          </Card.Header>
          
          <Card.Content>
            <PerformanceChart 
              data={convergence.map((value, index) => ({
                algorithm: `Iteration ${index + 1}`,
                cost: value,
                executionTime: 0,
                value
              }))}
              type="line"
              className="h-64"
            />
          </Card.Content>
        </Card>
      )}
    </div>
  )
}

export default Statistics