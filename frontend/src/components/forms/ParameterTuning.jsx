import React, { useState } from 'react'
import { Settings, Info } from 'lucide-react'
import Card from '../ui/Card'
import Input from '../ui/Input'
import Tabs from '../ui/Tabs'

const ParameterTuning = ({ parameters = {}, onParametersChange }) => {
  const [collapsed, setCollapsed] = useState(true)

  const updateParameter = (category, key, value) => {
    onParametersChange({
      ...parameters,
      [category]: {
        ...parameters[category],
        [key]: parseInt(value) || value
      }
    })
  }

  const quantumParams = {
    maxIterations: parameters.quantum?.maxIterations || 50,
    pLayers: parameters.quantum?.pLayers || 2,
    shots: parameters.quantum?.shots || 1024
  }

  const classicalParams = {
    maxIterations: parameters.classical?.maxIterations || 100,
    populationSize: parameters.classical?.populationSize || 50,
    generations: parameters.classical?.generations || 100
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-medium">Algorithm Parameters</h3>
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {collapsed ? 'Show' : 'Hide'} Advanced
          </button>
        </div>
      </Card.Header>

      {!collapsed && (
        <Card.Content>
          <Tabs defaultTab={0}>
            <Tabs.Tab label="Quantum Parameters">
              <div className="space-y-4">
                <Input
                  label="Max Iterations"
                  type="number"
                  min="10"
                  max="500"
                  value={quantumParams.maxIterations}
                  onChange={(e) => updateParameter('quantum', 'maxIterations', e.target.value)}
                />
                
                <Input
                  label="QAOA Layers (p)"
                  type="number"
                  min="1"
                  max="5"
                  value={quantumParams.pLayers}
                  onChange={(e) => updateParameter('quantum', 'pLayers', e.target.value)}
                />
                
                <Input
                  label="Quantum Shots"
                  type="number"
                  min="512"
                  max="8192"
                  step="512"
                  value={quantumParams.shots}
                  onChange={(e) => updateParameter('quantum', 'shots', e.target.value)}
                />

                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium">Quantum Tips:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• Higher shots = better accuracy, slower execution</li>
                        <li>• More layers = deeper circuit, may need more iterations</li>
                        <li>• Start with defaults for best balance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Tabs.Tab>

            <Tabs.Tab label="Classical Parameters">
              <div className="space-y-4">
                <Input
                  label="Max Iterations"
                  type="number"
                  min="50"
                  max="2000"
                  value={classicalParams.maxIterations}
                  onChange={(e) => updateParameter('classical', 'maxIterations', e.target.value)}
                />
                
                <Input
                  label="Population Size (GA)"
                  type="number"
                  min="20"
                  max="200"
                  value={classicalParams.populationSize}
                  onChange={(e) => updateParameter('classical', 'populationSize', e.target.value)}
                />
                
                <Input
                  label="Generations (GA)"
                  type="number"
                  min="10"
                  max="500"
                  value={classicalParams.generations}
                  onChange={(e) => updateParameter('classical', 'generations', e.target.value)}
                />

                <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Info className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800 dark:text-green-200">
                      <p className="font-medium">Classical Tips:</p>
                      <ul className="mt-1 space-y-1 text-xs">
                        <li>• More iterations = better solutions, longer runtime</li>
                        <li>• Larger population = more diversity in GA</li>
                        <li>• Adjust based on problem complexity</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </Tabs.Tab>
          </Tabs>
        </Card.Content>
      )}
    </Card>
  )
}

export default ParameterTuning