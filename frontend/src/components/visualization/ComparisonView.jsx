import React from 'react'
import { TrendingUp, Clock, Zap, Cpu } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import PerformanceChart from './PerformanceChart'
import { formatDistance, formatDuration, formatAlgorithmName } from '../../utils/formatters'

const ComparisonView = ({ results = {} }) => {
  const { quantum = [], classical = [] } = results

  const getBestResult = (resultsArray) => {
    if (!resultsArray.length) return null
    return resultsArray.reduce((best, current) => 
      current.cost < best.cost ? current : best
    )
  }

  const bestQuantum = getBestResult(quantum)
  const bestClassical = getBestResult(classical)
  
  const allResults = [...quantum, ...classical].map(result => ({
    ...result,
    type: quantum.includes(result) ? 'quantum' : 'classical'
  }))

  const getWinner = () => {
    if (!bestQuantum || !bestClassical) return null
    if (bestQuantum.cost < bestClassical.cost) return 'quantum'
    if (bestClassical.cost < bestQuantum.cost) return 'classical'
    return 'tie'
  }

  const winner = getWinner()

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quantum Best */}
        <Card variant={winner === 'quantum' ? 'quantum' : 'default'}>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Zap className="h-6 w-6 text-quantum-600" />
              <Badge variant={winner === 'quantum' ? 'quantum' : 'default'}>
                {winner === 'quantum' ? 'Winner' : 'Quantum'}
              </Badge>
            </div>
            
            {bestQuantum ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {formatAlgorithmName(bestQuantum.algorithm)}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Cost: {formatDistance(bestQuantum.cost)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Time: {formatDuration(bestQuantum.executionTime)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No quantum results</p>
            )}
          </Card.Content>
        </Card>

        {/* Classical Best */}
        <Card variant={winner === 'classical' ? 'quantum' : 'default'}>
          <Card.Content className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Cpu className="h-6 w-6 text-blue-600" />
              <Badge variant={winner === 'classical' ? 'primary' : 'default'}>
                {winner === 'classical' ? 'Winner' : 'Classical'}
              </Badge>
            </div>
            
            {bestClassical ? (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">
                  {formatAlgorithmName(bestClassical.algorithm)}
                </h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4" />
                    <span>Cost: {formatDistance(bestClassical.cost)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Time: {formatDuration(bestClassical.executionTime)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No classical results</p>
            )}
          </Card.Content>
        </Card>

        {/* Comparison Stats */}
        <Card>
          <Card.Content className="p-6">
            <h3 className="font-semibold text-lg mb-4">Comparison Stats</h3>
            
            {bestQuantum && bestClassical ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Cost Difference:</span>
                  <span className="font-medium">
                    {formatDistance(Math.abs(bestQuantum.cost - bestClassical.cost))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Time Difference:</span>
                  <span className="font-medium">
                    {formatDuration(Math.abs(bestQuantum.executionTime - bestClassical.executionTime))}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Improvement:</span>
                  <span className={`font-medium ${
                    winner === 'quantum' ? 'text-quantum-600' : 
                    winner === 'classical' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {winner === 'tie' ? 'Tie' : 
                     `${(Math.abs(bestQuantum.cost - bestClassical.cost) / Math.max(bestQuantum.cost, bestClassical.cost) * 100).toFixed(1)}%`
                    }
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Need both quantum and classical results
              </p>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Performance Chart */}
      {allResults.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Algorithm Performance</h3>
          </Card.Header>
          <Card.Content>
            <PerformanceChart data={allResults} type="bar" />
          </Card.Content>
        </Card>
      )}

      {/* Detailed Results Table */}
      {allResults.length > 0 && (
        <Card>
          <Card.Header>
            <h3 className="text-lg font-medium">Detailed Results</h3>
          </Card.Header>
          <Card.Content className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Algorithm
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {allResults.map((result, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatAlgorithmName(result.algorithm)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={result.type === 'quantum' ? 'quantum' : 'primary'}
                          size="sm"
                        >
                          {result.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDistance(result.cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                        {formatDuration(result.executionTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge 
                          variant={result.valid ? 'success' : 'danger'}
                          size="sm"
                        >
                          {result.valid ? 'Valid' : 'Invalid'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  )
}

export default ComparisonView