import axios from 'axios'

// Create separate axios instance for geocoding to avoid conflicts
const geocodingApi = axios.create({
  timeout: 10000, // 10 seconds for geocoding requests
})

/**
 * Geocoding service using OpenStreetMap Nominatim (Free, no API key required)
 * Fallback to MapBox if API key is provided
 */
class GeocodingService {
  constructor() {
    // You can add MapBox API key here for better results
    this.mapboxApiKey = import.meta.env.VITE_MAPBOX_API_KEY || null
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org'
    this.mapboxBaseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places'
  }

  /**
   * Search for places using Nominatim API
   * @param {string} query - Search query (city, address, landmark)
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Array of place suggestions
   */
  async searchPlaces(query, limit = 5) {
    if (!query || query.length < 2) return []

    try {
      // First try MapBox if API key is available (more accurate)
      if (this.mapboxApiKey) {
        return await this.searchWithMapbox(query, limit)
      }
      
      // Fallback to Nominatim (free)
      return await this.searchWithNominatim(query, limit)
    } catch (error) {
      console.warn('Geocoding search failed:', error.message)
      
      // If MapBox fails, try Nominatim as fallback
      if (this.mapboxApiKey) {
        try {
          return await this.searchWithNominatim(query, limit)
        } catch (nominatimError) {
          console.error('Both geocoding services failed:', nominatimError.message)
          return []
        }
      }
      
      return []
    }
  }

  /**
   * Search using MapBox Geocoding API (if API key is available)
   */
  async searchWithMapbox(query, limit) {
    const response = await geocodingApi.get(`${this.mapboxBaseUrl}/${encodeURIComponent(query)}.json`, {
      params: {
        access_token: this.mapboxApiKey,
        limit: limit,
        types: 'place,locality,neighborhood,address,poi'
      }
    })

    return response.data.features.map(feature => ({
      id: feature.id,
      displayName: feature.place_name,
      lat: feature.center[1],
      lng: feature.center[0],
      type: feature.place_type?.[0] || 'unknown',
      country: this.extractCountry(feature.context),
      source: 'mapbox'
    }))
  }

  /**
   * Search using OpenStreetMap Nominatim API (free)
   */
  async searchWithNominatim(query, limit) {
    const response = await geocodingApi.get(`${this.nominatimBaseUrl}/search`, {
      params: {
        q: query,
        format: 'json',
        limit: limit,
        addressdetails: 1,
        extratags: 1,
        namedetails: 1
      },
      headers: {
        'User-Agent': 'QuantumFleetVRP/1.0 (Quantum Vehicle Routing Problem Solver)'
      }
    })

    return response.data.map(place => ({
      id: place.place_id,
      displayName: place.display_name,
      lat: parseFloat(place.lat),
      lng: parseFloat(place.lon),
      type: place.type || place.class,
      country: place.address?.country || 'Unknown',
      source: 'nominatim',
      importance: place.importance || 0
    }))
  }

  /**
   * Reverse geocoding - get place name from coordinates
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<Object|null>} Place information
   */
  async reverseGeocode(lat, lng) {
    try {
      if (this.mapboxApiKey) {
        return await this.reverseGeocodeMapbox(lat, lng)
      }
      return await this.reverseGeocodeNominatim(lat, lng)
    } catch (error) {
      console.warn('Reverse geocoding failed:', error.message)
      return null
    }
  }

  async reverseGeocodeMapbox(lat, lng) {
    const response = await geocodingApi.get(`${this.mapboxBaseUrl}/${lng},${lat}.json`, {
      params: {
        access_token: this.mapboxApiKey,
        types: 'place,locality,neighborhood,address'
      }
    })

    const feature = response.data.features[0]
    if (!feature) return null

    return {
      displayName: feature.place_name,
      lat: lat,
      lng: lng,
      type: feature.place_type?.[0] || 'unknown',
      source: 'mapbox'
    }
  }

  async reverseGeocodeNominatim(lat, lng) {
    const response = await geocodingApi.get(`${this.nominatimBaseUrl}/reverse`, {
      params: {
        lat: lat,
        lon: lng,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'QuantumFleetVRP/1.0 (Quantum Vehicle Routing Problem Solver)'
      }
    })

    return {
      displayName: response.data.display_name,
      lat: lat,
      lng: lng,
      type: response.data.type || response.data.class,
      source: 'nominatim'
    }
  }

  /**
   * Extract country from MapBox context
   */
  extractCountry(context) {
    if (!context) return 'Unknown'
    const countryContext = context.find(ctx => ctx.id.startsWith('country'))
    return countryContext?.text || 'Unknown'
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(lat, lng) {
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)
    
    return !isNaN(latitude) && 
           !isNaN(longitude) && 
           latitude >= -90 && 
           latitude <= 90 && 
           longitude >= -180 && 
           longitude <= 180
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(lat, lng, precision = 4) {
    return {
      lat: parseFloat(parseFloat(lat).toFixed(precision)),
      lng: parseFloat(parseFloat(lng).toFixed(precision))
    }
  }
}

// Export singleton instance
export const geocodingService = new GeocodingService()

// Export utility functions
export const searchPlaces = (query, limit) => geocodingService.searchPlaces(query, limit)
export const reverseGeocode = (lat, lng) => geocodingService.reverseGeocode(lat, lng)
export const isValidCoordinates = (lat, lng) => geocodingService.isValidCoordinates(lat, lng)
export const formatCoordinates = (lat, lng, precision) => geocodingService.formatCoordinates(lat, lng, precision)