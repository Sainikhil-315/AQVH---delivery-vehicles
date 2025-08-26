export const validateLocation = (location) => {
  if (!Array.isArray(location) || location.length !== 2) {
    return { valid: false, error: 'Location must be an array of [lat, lng]' }
  }
  
  const [lat, lng] = location
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { valid: false, error: 'Coordinates must be numbers' }
  }
  
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' }
  }
  
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' }
  }
  
  return { valid: true }
}

export const validateProblem = (problem) => {
  const errors = []
  
  if (!problem.locations || problem.locations.length < 3) {
    errors.push('At least 3 locations required (1 depot + 2 customers)')
  }
  
  if (problem.num_vehicles < 1 || problem.num_vehicles > 5) {
    errors.push('Number of vehicles must be between 1 and 5')
  }
  
  if (problem.depot_index < 0 || problem.depot_index >= (problem.locations?.length || 0)) {
    errors.push('Invalid depot index')
  }
  
  // Validate each location
  problem.locations?.forEach((location, index) => {
    const validation = validateLocation(location)
    if (!validation.valid) {
      errors.push(`Location ${index + 1}: ${validation.error}`)
    }
  })
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export const validateQuantumLimits = (problem) => {
  const numLocations = problem.locations?.length || 0
  const num_vehicles = problem.num_vehicles || 1
  
  const estimatedQubits = (numLocations - 1) * num_vehicles * 2
  
  if (estimatedQubits > 20) {
    return {
      feasible: false,
      qubits: estimatedQubits,
      maxLocations: Math.floor(20 / (num_vehicles * 2)) + 1,
      message: 'Problem too large for quantum simulation'
    }
  }
  
  return {
    feasible: true,
    qubits: estimatedQubits,
    message: 'Problem suitable for quantum optimization'
  }
}