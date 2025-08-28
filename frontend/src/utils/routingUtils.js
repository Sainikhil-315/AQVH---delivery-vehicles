/**
 * Utility functions for routing operations, calculations, and data processing.
 * Provides helper functions for distance matrices, route optimization, and visualization.
 */

// Distance calculation utilities
export const calculateTotalDistance = (distanceMatrix) => {
  if (!distanceMatrix || !Array.isArray(distanceMatrix) || distanceMatrix.length === 0) {
    return 0;
  }

  let total = 0;
  const n = distanceMatrix.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && distanceMatrix[i] && distanceMatrix[i][j] !== undefined) {
        total += distanceMatrix[i][j];
      }
    }
  }
  
  return total;
};

export const calculateAverageDistance = (distanceMatrix) => {
  if (!distanceMatrix || !Array.isArray(distanceMatrix) || distanceMatrix.length === 0) {
    return 0;
  }

  const total = calculateTotalDistance(distanceMatrix);
  const n = distanceMatrix.length;
  const numPairs = n * (n - 1); // Exclude diagonal elements
  
  return numPairs > 0 ? total / numPairs : 0;
};

export const findShortestRoute = (distanceMatrix) => {
  if (!distanceMatrix || distanceMatrix.length === 0) {
    return { route: [], distance: 0 };
  }

  const n = distanceMatrix.length;
  if (n === 1) {
    return { route: [0], distance: 0 };
  }

  // Simple nearest neighbor heuristic for demonstration
  const visited = new Set();
  const route = [];
  let current = 0; // Start from depot
  let totalDistance = 0;

  route.push(current);
  visited.add(current);

  while (visited.size < n) {
    let nearest = -1;
    let minDistance = Infinity;

    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && distanceMatrix[current][i] < minDistance) {
        minDistance = distanceMatrix[current][i];
        nearest = i;
      }
    }

    if (nearest !== -1) {
      route.push(nearest);
      visited.add(nearest);
      totalDistance += minDistance;
      current = nearest;
    } else {
      break;
    }
  }

  // Return to depot
  if (route.length > 1) {
    totalDistance += distanceMatrix[current][0];
    route.push(0);
  }

  return { route, distance: totalDistance };
};

// Coordinate utilities
export const validateCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) {
    return false;
  }

  const [lat, lng] = coords;
  return (
    typeof lat === 'number' && 
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
};

export const formatCoordinates = (coords, precision = 6) => {
  if (!validateCoordinates(coords)) {
    return 'Invalid coordinates';
  }

  const [lat, lng] = coords;
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};

export const calculateBounds = (locations) => {
  if (!locations || locations.length === 0) {
    return null;
  }

  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  locations.forEach(([lat, lng]) => {
    if (validateCoordinates([lat, lng])) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    }
  });

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng,
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2]
  };
};

// Distance formatting utilities
export const formatDistance = (distance, unit = 'km') => {
  if (typeof distance !== 'number' || isNaN(distance)) {
    return 'N/A';
  }

  switch (unit) {
    case 'km':
      return distance < 1 
        ? `${(distance * 1000).toFixed(0)}m`
        : `${distance.toFixed(2)}km`;
    case 'm':
      return `${distance.toFixed(0)}m`;
    case 'mi':
      const miles = distance * 0.621371;
      return miles < 1
        ? `${(miles * 5280).toFixed(0)}ft`
        : `${miles.toFixed(2)}mi`;
    default:
      return `${distance.toFixed(2)}${unit}`;
  }
};

export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) {
    return 'N/A';
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}s`;
  }
};

// Route optimization utilities
export const optimizeRouteOrder = (locations, distanceMatrix) => {
  if (!locations || !distanceMatrix || locations.length <= 2) {
    return locations;
  }

  // Simple 2-opt improvement heuristic
  const n = locations.length;
  let bestRoute = [...Array(n).keys()];
  let bestDistance = calculateRouteDistance(bestRoute, distanceMatrix);
  let improved = true;

  while (improved) {
    improved = false;
    
    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // Try swapping edges
        const newRoute = [...bestRoute];
        
        // Reverse the segment between i and j
        const segment = newRoute.slice(i, j + 1).reverse();
        newRoute.splice(i, j - i + 1, ...segment);
        
        const newDistance = calculateRouteDistance(newRoute, distanceMatrix);
        
        if (newDistance < bestDistance) {
          bestRoute = newRoute;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  return bestRoute.map(i => locations[i]);
};

export const calculateRouteDistance = (route, distanceMatrix) => {
  if (!route || !distanceMatrix || route.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const from = route[i];
    const to = route[i + 1];
    
    if (distanceMatrix[from] && distanceMatrix[from][to] !== undefined) {
      totalDistance += distanceMatrix[from][to];
    }
  }

  return totalDistance;
};

// Comparison utilities
export const compareRoutingMethods = (results) => {
  if (!results || Object.keys(results).length < 2) {
    return null;
  }

  const methods = Object.keys(results);
  const comparison = {
    fastest: null,
    shortest: null,
    mostReliable: null,
    differences: {},
    summary: {}
  };

  // Find best performing method for each metric
  let fastestTime = Infinity;
  let shortestDistance = Infinity;
  let highestSuccess = 0;

  methods.forEach(method => {
    const result = results[method];
    if (result.status === 'success') {
      if (result.executionTime < fastestTime) {
        fastestTime = result.executionTime;
        comparison.fastest = method;
      }
      if (result.totalDistance < shortestDistance) {
        shortestDistance = result.totalDistance;
        comparison.shortest = method;
      }
    }
  });

  // Calculate relative differences
  methods.forEach(method => {
    const result = results[method];
    if (result.status === 'success') {
      comparison.summary[method] = {
        timeRatio: fastestTime > 0 ? result.executionTime / fastestTime : 1,
        distanceRatio: shortestDistance > 0 ? result.totalDistance / shortestDistance : 1,
        performance: calculatePerformanceScore(result, fastestTime, shortestDistance)
      };
    }
  });

  return comparison;
};

const calculatePerformanceScore = (result, fastestTime, shortestDistance) => {
  if (result.status !== 'success') return 0;

  const timeScore = fastestTime > 0 ? fastestTime / result.executionTime : 0;
  const distanceScore = shortestDistance > 0 ? shortestDistance / result.totalDistance : 0;
  
  // Weighted score (60% distance quality, 40% speed)
  return (distanceScore * 0.6 + timeScore * 0.4) * 100;
};

// Service status utilities
export const getServiceStatusColor = (status) => {
  switch (status) {
    case 'ready': return 'green';
    case 'error': return 'red';
    case 'limited': return 'yellow';
    case 'loading': return 'blue';
    default: return 'gray';
  }
};

export const getServiceStatusIcon = (status) => {
  switch (status) {
    case 'ready': return '✅';
    case 'error': return '❌';
    case 'limited': return '⚠️';
    case 'loading': return '⏳';
    default: return '❓';
  }
};

// Export utilities object
const routingUtils = {
  calculateTotalDistance,
  calculateAverageDistance,
  findShortestRoute,
  validateCoordinates,
  formatCoordinates,
  calculateBounds,
  formatDistance,
  formatDuration,
  optimizeRouteOrder,
  calculateRouteDistance,
  compareRoutingMethods,
  getServiceStatusColor,
  getServiceStatusIcon
};

export { routingUtils };
export default routingUtils;