import React, { useState, useRef, useEffect } from 'react'
import { MapPin, Plus, Trash2, Upload, Search, Navigation, Globe, MapIcon } from 'lucide-react'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Card from '../ui/Card'
import { searchPlaces, reverseGeocode, isValidCoordinates, formatCoordinates } from '../../utils/geocoding'

const LocationInput = ({ locations = [], onLocationsChange, depot_index = 0 }) => {
  const [newLocation, setNewLocation] = useState({ query: '', lat: '', lng: '' })
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [inputMode, setInputMode] = useState('search') // 'search' or 'manual'
  const [locationNames, setLocationNames] = useState({}) // Store place names for coordinates
  
  const searchTimeoutRef = useRef(null)
  const searchInputRef = useRef(null)

  // Debounced search function
  useEffect(() => {
    if (inputMode === 'search' && newLocation.query && newLocation.query.length >= 2) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        try {
          const results = await searchPlaces(newLocation.query, 5)
          setSearchResults(results)
          setShowSearchResults(results.length > 0)
        } catch (error) {
          console.error('Search failed:', error)
          setSearchResults([])
        } finally {
          setIsSearching(false)
        }
      }, 300)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [newLocation.query, inputMode])

  // Handle place selection from search results
  const selectPlace = (place) => {
    const formatted = formatCoordinates(place.lat, place.lng)
    setNewLocation({
      query: place.displayName,
      lat: formatted.lat.toString(),
      lng: formatted.lng.toString()
    })
    setSearchResults([])
    setShowSearchResults(false)
  }

  // Add location function
  const addLocation = async () => {
    let lat, lng, placeName = ''

    if (inputMode === 'search' && newLocation.query) {
      // If using search mode, try to get coordinates from query
      if (!newLocation.lat || !newLocation.lng) {
        const searchResult = searchResults[0]
        if (searchResult) {
          const formatted = formatCoordinates(searchResult.lat, searchResult.lng)
          lat = formatted.lat
          lng = formatted.lng
          placeName = searchResult.displayName
        } else {
          return // Can't add without coordinates
        }
      } else {
        lat = parseFloat(newLocation.lat)
        lng = parseFloat(newLocation.lng)
        placeName = newLocation.query
      }
    } else {
      // Manual coordinate entry
      lat = parseFloat(newLocation.lat)
      lng = parseFloat(newLocation.lng)
      
      // Try to get place name from coordinates
      try {
        const reverseResult = await reverseGeocode(lat, lng)
        if (reverseResult) {
          placeName = reverseResult.displayName
        }
      } catch (error) {
        console.warn('Reverse geocoding failed:', error)
        placeName = `${lat}, ${lng}`
      }
    }

    if (isValidCoordinates(lat, lng)) {
      const newLocationIndex = locations.length
      onLocationsChange([...locations, [lat, lng]])
      
      // Store the place name for this location
      setLocationNames(prev => ({
        ...prev,
        [newLocationIndex]: placeName
      }))
      
      setNewLocation({ query: '', lat: '', lng: '' })
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  // Remove location
  const removeLocation = (index) => {
    const newLocations = locations.filter((_, i) => i !== index)
    onLocationsChange(newLocations)
    
    // Remove stored name and reindex
    const newNames = {}
    Object.keys(locationNames).forEach(key => {
      const idx = parseInt(key)
      if (idx < index) {
        newNames[idx] = locationNames[key]
      } else if (idx > index) {
        newNames[idx - 1] = locationNames[key]
      }
    })
    setLocationNames(newNames)
  }

  // Update location coordinates
  const updateLocation = async (index, field, value) => {
    const newLocations = [...locations]
    const currentLocation = [...newLocations[index]]
    
    if (field === 'lat') {
      currentLocation[0] = parseFloat(value) || 0
    } else {
      currentLocation[1] = parseFloat(value) || 0
    }
    
    newLocations[index] = currentLocation
    onLocationsChange(newLocations)

    // Try to update place name if both coordinates are valid
    if (isValidCoordinates(currentLocation[0], currentLocation[1])) {
      try {
        const reverseResult = await reverseGeocode(currentLocation[0], currentLocation[1])
        if (reverseResult) {
          setLocationNames(prev => ({
            ...prev,
            [index]: reverseResult.displayName
          }))
        }
      } catch (error) {
        console.warn('Reverse geocoding failed:', error)
      }
    }
  }

  // Load sample data
  const loadSampleData = () => {
    const sampleLocations = [
      [40.7128, -74.0060], // NYC (Depot)
      [40.7589, -73.9851], // Times Square
      [40.7505, -73.9934], // Empire State
      [40.7614, -73.9776], // Central Park
      [40.7282, -74.0776]  // Liberty Island
    ]
    onLocationsChange(sampleLocations)
    
    // Set sample location names
    const sampleNames = {
      0: 'New York City, NY, USA (Depot)',
      1: 'Times Square, New York, NY, USA',
      2: 'Empire State Building, New York, NY, USA',
      3: 'Central Park, New York, NY, USA',
      4: 'Statue of Liberty, New York, NY, USA'
    }
    setLocationNames(sampleNames)
  }

  // Get user's current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const formatted = formatCoordinates(lat, lng)
        
        try {
          const reverseResult = await reverseGeocode(lat, lng)
          const placeName = reverseResult?.displayName || `Current Location (${formatted.lat}, ${formatted.lng})`
          
          setNewLocation({
            query: placeName,
            lat: formatted.lat.toString(),
            lng: formatted.lng.toString()
          })
        } catch (error) {
          setNewLocation({
            query: `Current Location (${formatted.lat}, ${formatted.lng})`,
            lat: formatted.lat.toString(),
            lng: formatted.lng.toString()
          })
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Unable to retrieve your location. Please enter coordinates manually.')
      }
    )
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-medium">Locations</h3>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              title="Use current location"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Current
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSampleData}
            >
              <Upload className="h-4 w-4 mr-1" />
              Sample Data
            </Button>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="space-y-4">
        {/* Current Locations */}
        <div className="space-y-3">
          {locations.map((location, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                {/* Place name display */}
                {locationNames[index] && (
                  <div className="mb-2 text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <Globe className="h-4 w-4 mr-1" />
                    <span className="truncate">{locationNames[index]}</span>
                  </div>
                )}
                
                {/* Coordinate inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Latitude"
                    value={location[0]}
                    onChange={(e) => updateLocation(index, 'lat', e.target.value)}
                    type="number"
                    step="any"
                  />
                  <Input
                    placeholder="Longitude"
                    value={location[1]}
                    onChange={(e) => updateLocation(index, 'lng', e.target.value)}
                    type="number"
                    step="any"
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2 mt-6">
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
                  title="Remove location"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add New Location */}
        <div className="border-t pt-4">
          {/* Input Mode Toggle */}
          <div className="flex space-x-2 mb-3">
            <Button
              variant={inputMode === 'search' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setInputMode('search')}
            >
              <Search className="h-4 w-4 mr-1" />
              Search Places
            </Button>
            <Button
              variant={inputMode === 'manual' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setInputMode('manual')}
            >
              <MapIcon className="h-4 w-4 mr-1" />
              Manual Coordinates
            </Button>
          </div>

          {/* Search Mode */}
          {inputMode === 'search' && (
            <div className="relative">
              <div className="flex space-x-3 mb-3">
                <div className="flex-1 relative">
                  <Input
                    ref={searchInputRef}
                    placeholder="Search for cities, addresses, landmarks..."
                    value={newLocation.query}
                    onChange={(e) => setNewLocation({ ...newLocation, query: e.target.value })}
                    className="pr-8"
                  />
                  {isSearching && (
                    <div className="absolute right-2 top-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={addLocation}
                  disabled={!newLocation.query && (!newLocation.lat || !newLocation.lng)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Search Results */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      onClick={() => selectPlace(result)}
                    >
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {result.displayName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {result.lat.toFixed(4)}, {result.lng.toFixed(4)} • {result.source}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Coordinate preview for search mode */}
              {newLocation.lat && newLocation.lng && (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Coordinates: {newLocation.lat}, {newLocation.lng}
                </div>
              )}
            </div>
          )}

          {/* Manual Mode */}
          {inputMode === 'manual' && (
            <div className="flex space-x-3">
              <Input
                placeholder="Latitude"
                value={newLocation.lat}
                onChange={(e) => setNewLocation({ ...newLocation, lat: e.target.value, query: '' })}
                type="number"
                step="any"
              />
              <Input
                placeholder="Longitude"
                value={newLocation.lng}
                onChange={(e) => setNewLocation({ ...newLocation, lng: e.target.value, query: '' })}
                type="number"
                step="any"
              />
              <Button
                variant="primary"
                onClick={addLocation}
                disabled={!newLocation.lat || !newLocation.lng}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>
            {inputMode === 'search' 
              ? 'Search for places by name or click "Manual Coordinates" to enter lat/lng directly.'
              : 'Enter coordinates manually or switch to "Search Places" for location search.'}
          </p>
          <p className="mt-1">
            You have {locations.length} locations ({locations.length > 0 ? locations.length - 1 : 0} customers + {locations.length > 0 ? 1 : 0} depot)
          </p>
        </div>
      </Card.Content>
    </Card>
  )
}

export default LocationInput