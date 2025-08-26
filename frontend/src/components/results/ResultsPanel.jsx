import React from 'react'
import { CheckCircle, AlertCircle, Clock, TrendingUp } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import RouteDetails from './RouteDetails'
import Statistics from './Statistics'
import ExportOptions from './ExportOptions'
import { formatDistance, formatDuration, formatAlgorithmName } from '../../utils/formatters'

const ResultsPanel = ({ results, onExport }) => {
  if (!results) {
    return (
      <Card>
        <Card.Content className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Results Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Run an optimization to see results here.
          </p>
        </Card.Content>
      </Card>
    )
  }

  const { algorithm, cost, executionTime, routes, valid, qubits, iterations } = results

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatAlgorithmName(algorithm)}
                </h2>
                <Badge variant={valid ? 'success' : 'danger'}>
                  {valid ? 'Valid Solution' : 'Invalid Solution'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-primary-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Total Cost</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatDistance(cost)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-primary-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">Execution Time</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatDuration(executionTime)}
                  </p>
                </div>
                
                {qubits && (
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Qubits Used</span>
                    <p className="text-lg font-semibold text-quantum-600">
                      {qubits}
                    </p>
                  </div>
                )}
                
                {iterations && (
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Iterations</span>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {iterations}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <CheckCircle className={`h-6 w-6 ${valid ? 'text-green-500' : 'text-red-500'}`} />
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Route Details */}
      {routes && routes.length > 0 && (
        <RouteDetails routes={routes} />
      )}

      {/* Statistics */}
      <Statistics results={results} />

      {/* Export Options */}
      <ExportOptions results={results} onExport={onExport} />
    </div>
  )
}

export default ResultsPanel