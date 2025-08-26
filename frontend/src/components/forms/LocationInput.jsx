import React, { useState } from 'react'
import { MapPin, Plus, Trash2, Upload } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'

const LocationInput = ({ locations = [], onLocationsChange, depot_index = 0 }) => {
  const [newLocation, setNewLocation] = useState({ lat: '', lng: '' })

  const addLocation = () => {
    if (newLocation.lat && newLocation.lng) {
      const lat = parseFloat(newLocation.lat)
      const lng = parseFloat(newLocation.lng)
      
      if (!isNaN(lat) && !isNaN(lng)) {
        onLocationsChange([...locations, [lat, lng]])
        setNewLocation({ lat: '', lng: '' })
      }
    }
  }

  const removeLocation = (index) => {
    const newLocations = locations.filter((_, i) => i !== index)
    onLocationsChange(newLocations)
  }

  const updateLocation = (index, field, value) => {
    const newLocations = [...locations]
    const currentLocation = [...newLocations[index]]
    
    if (field === 'lat') {
      currentLocation[0] = parseFloat(value) || 0
    } else {
      currentLocation[1] = parseFloat(value) || 0
    }
    
    newLocations[index] = currentLocation
    onLocationsChange(newLocations)
  }

  const loadSampleData = () => {
    const sampleLocations = [
      [40.7128, -74.0060], // NYC (Depot)
      [40.7589, -73.9851], // Times Square
      [40.7505, -73.9934], // Empire State
      [40.7614, -73.9776], // Central Park
      [40.7282, -74.0776]  // Liberty Island
    ]
    onLocationsChange(sampleLocations)
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-medium">Locations</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadSampleData}
          >
            <Upload className="h-4 w-4 mr-1" />
            Sample Data
          </Button>
        </div>
      </Card.Header>

      <Card.Content className="space-y-4">
        {/* Current Locations */}
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input
                  placeholder="Latitude"
                  value={location[0]}
                  onChange={(e) => updateLocation(index, 'lat', e.target.value)}
                />
                <Input
                  placeholder="Longitude"
                  value={location[1]}
                  onChange={(e) => updateLocation(index, 'lng', e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                {index === depot_index && (
                  <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full dark:bg-primary-900 dark:text-primary-300">
                    Depot
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLocation(index)}
                  disabled={locations.length <= 2}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Location */}
        <div className="border-t pt-4">
          <div className="flex space-x-3">
            <Input
              placeholder="Latitude"
              value={newLocation.lat}
              onChange={(e) => setNewLocation({ ...newLocation, lat: e.target.value })}
            />
            <Input
              placeholder="Longitude"
              value={newLocation.lng}
              onChange={(e) => setNewLocation({ ...newLocation, lng: e.target.value })}
            />
            <Button
              variant="primary"
              onClick={addLocation}
              disabled={!newLocation.lat || !newLocation.lng}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>Click on the map to add locations or enter coordinates manually.</p>
          <p className="mt-1">You have {locations.length} locations ({locations.length > 0 ? locations.length - 1 : 0} customers + {locations.length > 0 ? 1 : 0} depot)</p>
        </div>
      </Card.Content>
    </Card>
  )
}

export default LocationInput