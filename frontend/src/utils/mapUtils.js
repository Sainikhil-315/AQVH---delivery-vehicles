export const calculateDistance = (point1, point2) => {
  const dx = point1[0] - point2[0]
  const dy = point1[1] - point2[1]
  return Math.sqrt(dx * dx + dy * dy)
}

export const getRouteColors = (numRoutes) => {
  const colors = [
    '#ef4444', '#3b82f6', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ]
  return colors.slice(0, numRoutes)
}

export const formatCoordinates = (coords) => {
  if (Array.isArray(coords) && coords.length === 2) {
    return [parseFloat(coords[0]), parseFloat(coords[1])]
  }
  return [0, 0]
}

export const createBounds = (locations) => {
  if (!locations || locations.length === 0) return null
  
  const lats = locations.map(loc => loc[0])
  const lngs = locations.map(loc => loc[1])
  
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)]
  ]
}

export const getMapCenter = (locations) => {
  if (!locations || locations.length === 0) return [40.7128, -74.0060] // Default to NYC
  
  const avgLat = locations.reduce((sum, loc) => sum + loc[0], 0) / locations.length
  const avgLng = locations.reduce((sum, loc) => sum + loc[1], 0) / locations.length
  
  return [avgLat, avgLng]
}