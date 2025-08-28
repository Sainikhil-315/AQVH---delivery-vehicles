import React, { useContext, useState } from 'react'
import { Cpu, Zap, CheckCircle, MapPin, Settings, AlertCircle } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Toggle from '../ui/Toggle'
import Select from '../ui/Select'
import { formatAlgorithmName } from '../../utils/formatters'
import { AppContext } from '../../context/AppContext'
import { RoutingContext } from '../../context/RoutingContext'

const AlgorithmSelector = ({ 
  selectedAlgorithms = { classical: [], quantum: [] }, 
  onSelectionChange 
}) => {
  const { state } = useContext(AppContext)
  const { routingState, updateRoutingConfig } = useContext(RoutingContext)
  const [showRoutingSettings, setShowRoutingSettings] = useState(false)

  const algorithms = {
    classical: [
      { id: 'nearest_neighbor', name: 'Nearest Neighbor', speed: 'Fast', accuracy: 'Good' },
      { id: 'genetic_algorithm', name: 'Genetic Algorithm', speed: 'Medium', accuracy: 'Very Good' },
      { id: 'simulated_annealing', name: 'Simulated Annealing', speed: 'Medium', accuracy: 'Good' },
      { id: 'branch_and_bound', name: 'Branch & Bound', speed: 'Slow', accuracy: 'Optimal' }
    ],
    quantum: [
      { id: 'SPSA', name: 'SPSA', description: 'Robust noisy optimization' },
      { id: 'COBYLA', name: 'COBYLA', description: 'Constrained optimization' },
      { id: 'ADAM', name: 'ADAM', description: 'Adaptive moment estimation' },
      { id: 'Powell', name: 'Powell', description: 'Powell method' }
    ]
  }

  const routingModes = [
    { 
      value: 'euclidean', 
      label: 'Euclidean Distance', 
      description: 'Direct line distance (fastest)',
      icon: '📏',
      performance: 'Fast'
    },
    { 
      value: 'osrm', 
      label: 'OSRM Routing', 
      description: 'Real road network routing',
      icon: '🛣️',
      performance: 'Medium'
    },
    { 
      value: 'openroute', 
      label: 'OpenRoute Service', 
      description: 'Advanced routing with profiles',
      icon: '🗺️',
      performance: 'Slower'
    }
  ]

  const routingProfiles = [
    { value: 'driving', label: 'Driving', icon: '🚗' },
    { value: 'walking', label: 'Walking', icon: '🚶' },
    { value: 'cycling', label: 'Cycling', icon: '🚴' }
  ]

  const toggleAlgorithm = (type, algorithmId) => {
    const current = selectedAlgorithms[type] || []
    const updated = current.includes(algorithmId)
      ? current.filter(id => id !== algorithmId)
      : [...current, algorithmId]
    
    onSelectionChange({
      ...selectedAlgorithms,
      [type]: updated
    })
  }

  const handleRoutingToggle = (enabled) => {
    updateRoutingConfig({ enabled })
    if (!enabled) {
      // Reset to euclidean when disabled
      updateRoutingConfig({ mode: 'euclidean' })
    }
  }

  const getServiceStatus = (service) => {
    const status = routingState.serviceStatus[service]
    return status === 'healthy' ? 'success' : status === 'error' ? 'danger' : 'warning'
  }

  return (
    <div className="space-y-6">
      {/* Routing Configuration */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-medium">Distance Calculation</h3>
            </div>
            <Toggle
              checked={routingState.enabled}
              onChange={handleRoutingToggle}
              size="sm"
            />
          </div>
        </Card.Header>
        
        <Card.Content>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {routingModes.map((mode) => {
                const isSelected = routingState.mode === mode.value
                const isDisabled = !routingState.enabled && mode.value !== 'euclidean'
                
                return (
                  <div
                    key={mode.value}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : isDisabled
                        ? 'border-gray-200 bg-gray-50 dark:bg-gray-800 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                    onClick={() => !isDisabled && updateRoutingConfig({ mode: mode.value })}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-lg">{mode.icon}</span>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {mode.label}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {mode.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge size="xs" variant={
                            mode.performance === 'Fast' ? 'success' : 
                            mode.performance === 'Medium' ? 'warning' : 'danger'
                          }>
                            {mode.performance}
                          </Badge>
                          {mode.value !== 'euclidean' && (
                            <Badge 
                              size="xs" 
                              variant={getServiceStatus(mode.value)}
                            >
                              {routingState.serviceStatus[mode.value] || 'Unknown'}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Advanced Routing Settings */}
            {routingState.enabled && routingState.mode !== 'euclidean' && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Routing Settings
                  </h4>
                  <button
                    onClick={() => setShowRoutingSettings(!showRoutingSettings)}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center space-x-1"
                  >
                    <Settings className="h-3 w-3" />
                    <span>{showRoutingSettings ? 'Hide' : 'Show'} Settings</span>
                  </button>
                </div>

                {showRoutingSettings && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Vehicle Profile
                      </label>
                      <Select
                        value={routingState.profile}
                        onChange={(profile) => updateRoutingConfig({ profile })}
                        options={routingProfiles.map(p => ({
                          value: p.value,
                          label: `${p.icon} ${p.label}`
                        }))}
                        size="sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Service Status
                      </label>
                      <div className="flex items-center space-x-2 text-xs">
                        <div className={`w-2 h-2 rounded-full ${
                          routingState.serviceStatus[routingState.mode] === 'healthy' 
                            ? 'bg-green-500' 
                            : routingState.serviceStatus[routingState.mode] === 'error'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          {routingState.serviceStatus[routingState.mode] || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Performance Warning */}
                {routingState.mode !== 'euclidean' && state.currentProblem.locations.length > 6 && (
                  <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-yellow-800 dark:text-yellow-200">
                      <strong>Performance Notice:</strong> Road routing with {state.currentProblem.locations.length} locations 
                      may take longer to compute. Consider using fewer locations or Euclidean distance for faster results.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card.Content>
      </Card>

      {/* Classical Algorithms */}
      <Card>
        <Card.Header>
          <div className="flex items-center space-x-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium">Classical Algorithms</h3>
            <Badge variant="primary">
              {selectedAlgorithms.classical?.length || 0} selected
            </Badge>
          </div>
        </Card.Header>
        
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {algorithms.classical.map((algorithm) => {
              const isSelected = selectedAlgorithms.classical?.includes(algorithm.id)
              
              return (
                <div
                  key={algorithm.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`}
                  onClick={() => toggleAlgorithm('classical', algorithm.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-black">
                        {algorithm.name}
                      </h4>
                      <div className="mt-2 space-x-2">
                        <Badge size="sm" variant={algorithm.speed === 'Fast' ? 'success' : algorithm.speed === 'Medium' ? 'warning' : 'danger'}>
                          {algorithm.speed}
                        </Badge>
                        <Badge size="sm" variant="default">
                          {algorithm.accuracy}
                        </Badge>
                      </div>
                      {routingState.enabled && routingState.mode !== 'euclidean' && (
                        <div className="mt-2">
                          <Badge size="xs" variant="info">
                            Road routing compatible
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card.Content>
      </Card>

      {/* Quantum Algorithms */}
      <Card variant="quantum">
        <Card.Header>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-quantum-600" />
            <h3 className="text-lg font-medium">Quantum Algorithms</h3>
            <Badge variant="quantum">
              {selectedAlgorithms.quantum?.length || 0} selected
            </Badge>
          </div>
        </Card.Header>
        
        <Card.Content>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {algorithms.quantum.map((algorithm) => {
              const isSelected = selectedAlgorithms.quantum?.includes(algorithm.id)
              
              return (
                <div
                  key={algorithm.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-quantum-500 bg-quantum-50 dark:bg-quantum-950'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                  }`} 
                  onClick={() => toggleAlgorithm('quantum', algorithm.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-large text-black dark:text-black">
                        {algorithm.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-900 mt-1">
                        {algorithm.description}
                      </p>
                      {routingState.enabled && routingState.mode !== 'euclidean' && (
                        <div className="mt-2">
                          <Badge size="xs" variant="quantum">
                            Road routing compatible
                          </Badge>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-5 w-5 text-quantum-600" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

export default AlgorithmSelector