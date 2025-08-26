import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Download, RotateCcw } from 'lucide-react'
import Button from '../components/ui/Button'
import Tabs from '../components/ui/Tabs'
import RouteMap from '../components/visualization/RouteMap'
import ResultsPanel from '../components/results/ResultsPanel'
import ComparisonView from '../components/visualization/ComparisonView'
import Card from '../components/ui/Card'
import { useApp } from '../context/AppContext'
import { useNotifications } from '../hooks/useNotifications'

const Results = () => {
  const { state, dispatch } = useApp()
  const { currentProblem, currentResults, isLoading } = state
  const notify = useNotifications()
  const [activeTab, setActiveTab] = useState(0)

  // Handle export functionality
  const handleExport = async (format) => {
    if (!currentResults) {
      notify.error('No results to export')
      return
    }

    try {
      let exportData
      let filename
      let mimeType

      switch (format) {
        case 'json':
          exportData = JSON.stringify({
            problem: currentProblem,
            results: currentResults,
            timestamp: new Date().toISOString()
          }, null, 2)
          filename = `vrp-results-${Date.now()}.json`
          mimeType = 'application/json'
          break
        
        case 'csv':
          // Convert routes to CSV format
          const csvRows = [
            ['Vehicle', 'Route', 'Total Distance', 'Stops']
          ]
          
          if (currentResults.routes) {
            currentResults.routes.forEach((route, index) => {
              csvRows.push([
                `Vehicle ${index + 1}`,
                route.join(' -> '),
                calculateRouteDistance(route).toFixed(2),
                route.length
              ])
            })
          }
          
          exportData = csvRows.map(row => row.join(',')).join('\n')
          filename = `vrp-routes-${Date.now()}.csv`
          mimeType = 'text/csv'
          break
        
        default:
          throw new Error('Unsupported format')
      }

      // Create and download file
      const blob = new Blob([exportData], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      notify.success(`Results exported as ${format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      notify.error('Failed to export results')
    }
  }

  // Calculate route distance helper
  const calculateRouteDistance = (route) => {
    if (!route || route.length < 2) return 0
    
    let distance = 0
    for (let i = 0; i < route.length - 1; i++) {
      const loc1 = currentProblem.locations[route[i]]
      const loc2 = currentProblem.locations[route[i + 1]]
      if (loc1 && loc2) {
        distance += Math.sqrt(
          Math.pow(loc1[0] - loc2[0], 2) + Math.pow(loc1[1] - loc2[1], 2)
        )
      }
    }
    return distance * 111 // Rough conversion to km
  }

  // Handle restart/reset
  const handleRestart = () => {
    dispatch({ type: 'RESET_PROBLEM' })
    notify.info('Problem reset. Ready for new optimization.')
  }

  // Prepare comparison data if we have multiple results
  const comparisonData = currentResults ? {
    quantum: Array.isArray(currentResults) 
      ? currentResults.filter(r => r.algorithm && ['SPSA', 'COBYLA', 'ADAM', 'Powell'].includes(r.algorithm))
      : (['SPSA', 'COBYLA', 'ADAM', 'Powell'].includes(currentResults.algorithm)) ? [currentResults] : [],
    classical: Array.isArray(currentResults)
      ? currentResults.filter(r => r.algorithm && ['nearest_neighbor', 'genetic_algorithm', 'simulated_annealing'].includes(r.algorithm))
      : (['nearest_neighbor', 'genetic_algorithm', 'simulated_annealing'].includes(currentResults.algorithm)) ? [currentResults] : []
  } : { quantum: [], classical: [] }

  const hasMultipleResults = comparisonData.quantum.length + comparisonData.classical.length > 1

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <Card.Content className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Processing Optimization...
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                This may take a few moments depending on the problem complexity.
              </p>
            </Card.Content>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Setup
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Optimization Results
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRestart}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              New Problem
            </Button>
            
            {currentResults && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => handleExport('json')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Results
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Visualization */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Route Visualization
                </h2>
              </Card.Header>
              <Card.Content className="p-0">
                <div className="h-96 lg:h-[600px]">
                  <RouteMap
                    locations={currentProblem.locations}
                    routes={currentResults?.routes || []}
                    depotIndex={currentProblem.depotIndex}
                    interactive={false}
                    className="h-full"
                  />
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Results Summary */}
          <div className="space-y-6">
            <Card>
              <Card.Header>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Problem Summary
                </h3>
              </Card.Header>
              <Card.Content>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Locations:</span>
                    <span className="font-medium">{currentProblem.locations.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Vehicles:</span>
                    <span className="font-medium">{currentProblem.num_vehicles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Depot:</span>
                    <span className="font-medium">Location {currentProblem.depot_index}</span>
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* Quick Actions */}
            {currentResults && (
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Quick Actions
                  </h3>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleExport('json')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export JSON
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleExport('csv')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>
                </Card.Content>
              </Card>
            )}
          </div>
        </div>

        {/* Detailed Results */}
        <div className="mt-8">
          <Tabs defaultTab={0} onChange={setActiveTab}>
            <Tabs.Tab label="Results Details">
              <ResultsPanel 
                results={Array.isArray(currentResults) ? currentResults[0] : currentResults}
                onExport={handleExport}
              />
            </Tabs.Tab>
            
            {hasMultipleResults && (
              <Tabs.Tab label="Algorithm Comparison">
                <ComparisonView results={comparisonData} />
              </Tabs.Tab>
            )}
            
            <Tabs.Tab label="Raw Data">
              <Card>
                <Card.Header>
                  <h3 className="text-lg font-medium">Raw Results Data</h3>
                </Card.Header>
                <Card.Content>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-sm overflow-auto max-h-96">
                    {JSON.stringify(
                      {
                        problem: currentProblem,
                        results: currentResults
                      },
                      null,
                      2
                    )}
                  </pre>
                </Card.Content>
              </Card>
            </Tabs.Tab>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default Results