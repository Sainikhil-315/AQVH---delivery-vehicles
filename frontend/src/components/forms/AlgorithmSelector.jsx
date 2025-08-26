import React from 'react'
import { Cpu, Zap, CheckCircle } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import { formatAlgorithmName } from '../../utils/formatters'

const AlgorithmSelector = ({ 
  selectedAlgorithms = { classical: [], quantum: [] }, 
  onSelectionChange 
}) => {
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

  return (
    <div className="space-y-6">
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
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
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
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {algorithm.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {algorithm.description}
                      </p>
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