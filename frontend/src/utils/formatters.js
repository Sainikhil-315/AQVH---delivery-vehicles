// src/utils/formatters.js

export const formatDistance = (distance) => {
  if (typeof distance !== 'number' || isNaN(distance)) {
    return 'N/A'
  }
  
  if (distance < 0.1) {
    return `${(distance * 1000).toFixed(0)}m`
  } else if (distance < 10) {
    return `${distance.toFixed(2)} km`
  } else {
    return `${distance.toFixed(1)} km`
  }
}

export const formatDuration = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds)) {
    return 'N/A'
  }
  
  if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`
  } else if (seconds < 60) {
    return `${seconds.toFixed(2)}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }
}

export const formatAlgorithmName = (algorithm) => {
  if (!algorithm) return 'Unknown Algorithm'
  
  const algorithmMap = {
    'nearest_neighbor': 'Nearest Neighbor',
    'genetic_algorithm': 'Genetic Algorithm',
    'simulated_annealing': 'Simulated Annealing',
    'SPSA': 'QAOA-SPSA',
    'COBYLA': 'QAOA-COBYLA',
    'ADAM': 'QAOA-ADAM',
    'Powell': 'QAOA-Powell',
    'tabu_search': 'Tabu Search',
    'ant_colony': 'Ant Colony Optimization'
  }
  
  return algorithmMap[algorithm] || algorithm.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

export const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'N/A'
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

export const formatPercentage = (value, decimals = 1) => {
  if (typeof value !== 'number' || isNaN(value)) {
    return 'N/A'
  }
  
  return `${(value * 100).toFixed(decimals)}%`
}

export const formatNumber = (number, decimals = 2) => {
  if (typeof number !== 'number' || isNaN(number)) {
    return 'N/A'
  }
  
  if (Math.abs(number) >= 1000000) {
    return `${(number / 1000000).toFixed(1)}M`
  } else if (Math.abs(number) >= 1000) {
    return `${(number / 1000).toFixed(1)}K`
  } else {
    return number.toFixed(decimals)
  }
}

export const formatTimestamp = (timestamp) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}