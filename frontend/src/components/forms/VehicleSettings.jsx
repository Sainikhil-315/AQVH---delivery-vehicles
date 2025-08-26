import React from 'react'
import { Truck, Home } from 'lucide-react'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Card from '../ui/Card'

const VehicleSettings = ({ 
  num_vehicles, 
  onnum_vehiclesChange, 
  depot_index, 
  onDepotChange, 
  locations = [] 
}) => {
  const depotOptions = locations.map((_, index) => ({
    value: index,
    label: `Location ${index + 1} (${locations[index]?.[0]?.toFixed(4)}, ${locations[index]?.[1]?.toFixed(4)})`
  }))

  const handleVehicleChange = (e) => {
    const value = parseInt(e.target.value)
    if (value >= 1 && value <= 5) {
      onnum_vehiclesChange(value)
    }
  }

  const handleDepotChange = (e) => {
    onDepotChange(parseInt(e.target.value))
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center space-x-2">
          <Truck className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-medium">Vehicle Configuration</h3>
        </div>
      </Card.Header>

      <Card.Content className="space-y-6">
        {/* Number of Vehicles */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Vehicles
          </label>
          <Input
            type="number"
            min="1"
            max="5"
            value={num_vehicles}
            onChange={handleVehicleChange}
            className="w-32"
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Maximum 5 vehicles supported
          </p>
        </div>

        {/* Depot Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <div className="flex items-center space-x-2">
              <Home className="h-4 w-4" />
              <span>Depot Location</span>
            </div>
          </label>
          <Select
            value={depot_index}
            onChange={handleDepotChange}
            options={depotOptions}
            disabled={locations.length === 0}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            All vehicles start and end at the depot
          </p>
        </div>

        {/* Vehicle Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Configuration Summary
          </h4>
          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <p>• {num_vehicles} vehicle{num_vehicles > 1 ? 's' : ''} available</p>
            <p>• Depot at location {depot_index + 1}</p>
            <p>• {Math.max(0, locations.length - 1)} customer locations</p>
            <p>• Estimated complexity: {locations.length > 0 ? 'Medium' : 'Low'}</p>
          </div>
        </div>
      </Card.Content>
    </Card>
  )
}

export default VehicleSettings