import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getRouteColors } from '../../utils/mapUtils'

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const RouteMap = ({ 
  locations = [], 
  routes = [], 
  depot_index = 0, 
  onLocationAdd, 
  interactive = true,
  className = '' 
}) => {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const routeLinesRef = useRef([])

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    // Initialize map with proper z-index
    mapInstance.current = L.map(mapRef.current, {
      center: locations.length > 0 ? locations[0] : [40.7128, -74.0060],
      zoom: 10,
      zoomControl: true,
      // Ensure map stays below navbar
      zoomControlOptions: {
        position: 'topright'
      }
    })

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(mapInstance.current)

    // Add click handler for adding locations
    if (interactive && onLocationAdd) {
      mapInstance.current.on('click', (e) => {
        onLocationAdd([e.latlng.lat, e.latlng.lng])
      })
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove()
        mapInstance.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstance.current) return

    // Clear existing markers and routes
    markersRef.current.forEach(marker => marker.remove())
    routeLinesRef.current.forEach(line => line.remove())
    markersRef.current = []
    routeLinesRef.current = []

    if (locations.length === 0) return

    // Add location markers
    locations.forEach((location, index) => {
      const isDepot = index === depot_index
      
      const marker = L.marker([location[0], location[1]], {
        icon: L.divIcon({
          html: `<div class="${isDepot ? 'depot-marker' : 'customer-marker'}"></div>`,
          iconSize: [isDepot ? 20 : 16, isDepot ? 20 : 16],
          iconAnchor: [isDepot ? 10 : 8, isDepot ? 10 : 8],
          className: 'custom-div-icon'
        }),
        zIndexOffset: isDepot ? 1000 : 500 // Ensure depot is always on top
      })

      marker.addTo(mapInstance.current)
      
      // Add popup
      marker.bindPopup(`
        <div class="text-sm">
          <strong>${isDepot ? 'Depot' : `Customer ${index}`}</strong><br>
          Lat: ${location[0].toFixed(4)}<br>
          Lng: ${location[1].toFixed(4)}
        </div>
      `)

      markersRef.current.push(marker)
    })

    // Add route lines
    if (routes.length > 0) {
      const colors = getRouteColors(routes.length)
      
      routes.forEach((route, routeIndex) => {
        if (route.length > 1) {
          const routeCoords = route.map(locationIndex => locations[locationIndex])
          
          const polyline = L.polyline(routeCoords, {
            color: colors[routeIndex],
            weight: 3,
            opacity: 0.8,
            // Ensure routes stay below markers
            interactive: true
          })
          
          polyline.addTo(mapInstance.current)
          routeLinesRef.current.push(polyline)

          // Add route popup
          polyline.bindPopup(`
            <div class="text-sm">
              <strong>Vehicle ${routeIndex + 1}</strong><br>
              Stops: ${route.length}<br>
              Distance: ${calculateRouteDistance(route, locations).toFixed(2)} km
            </div>
          `)
        }
      })
    }

    // Fit bounds if we have locations
    if (locations.length > 0) {
      const group = new L.featureGroup(markersRef.current)
      mapInstance.current.fitBounds(group.getBounds().pad(0.1))
    }
  }, [locations, routes, depot_index])

  const calculateRouteDistance = (route, locations) => {
    let distance = 0
    for (let i = 0; i < route.length - 1; i++) {
      const loc1 = locations[route[i]]
      const loc2 = locations[route[i + 1]]
      distance += Math.sqrt(Math.pow(loc1[0] - loc2[0], 2) + Math.pow(loc1[1] - loc2[1], 2))
    }
    return distance * 111 // Rough conversion to km
  }

  return (
    <div className={`map-container ${className}`}>
      <div 
        ref={mapRef} 
        className="w-full h-full min-h-[400px] rounded-lg relative"
        style={{ zIndex: 1 }} // Explicit z-index to stay below navbar
      />
      {interactive && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg text-xs z-10 border border-gray-200 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">
            Click on map to add locations
          </p>
        </div>
      )}
    </div>
  )
}

export default RouteMap