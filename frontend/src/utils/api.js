import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 1200000, // 4 minutes for quantum algorithms
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor for logging
api.interceptors.request.use((config) => {
  console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`)
  return config
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log("API Raw Response:", response.data)
    return response
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    throw error
  }
)

export const apiClient = {
  // Health check
  health: () => api.get('/health'),
  
  // Test cases
  getTestCases: () => api.get('/test-cases'),
  
  // Algorithms
  getAlgorithms: () => api.get('/algorithms'),
  
  // Original solve endpoints (Euclidean distance)
  solveQuantum: (data) => api.post('/solve/quantum', data),
  solveClassical: (data) => api.post('/solve/classical', data),
  compareAll: (data) => api.post('/compare/all', data),
  
  // New routing-enhanced solve endpoints
  solveQuantumWithRouting: (data) => api.post('/solve/quantum/routing', data),
  solveClassicalWithRouting: (data) => api.post('/solve/classical/routing', data),
  
  // Routing service endpoints
  routing: {
    // Get available routing services
    getServices: () => api.get('/routing/services'),
    
    // Test routing service connectivity
    testService: (service) => api.get(`/routing/test/${service}`),
    
    // Calculate single route
    calculateRoute: (data) => api.post('/routing/route', data),
    
    // Calculate distance matrix
    calculateMatrix: (data) => api.post('/routing/matrix', data),
    
    // Cache management
    getCacheStats: () => api.get('/routing/cache/stats'),
    clearCache: () => api.post('/routing/cache/clear')
  }
}

// Helper function to determine which solve endpoint to use
export const solveProblem = async (problemData, algorithmType, useRouting = false) => {
  try {
    console.log('Solving problem:', { problemData, algorithmType, useRouting })
    
    if (useRouting && problemData.routing_mode !== 'euclidean') {
      // Use routing-enhanced endpoints
      if (algorithmType === 'quantum') {
        return await apiClient.solveQuantumWithRouting(problemData)
      } else {
        return await apiClient.solveClassicalWithRouting(problemData)
      }
    } else {
      // Use original endpoints (Euclidean distance)
      const originalFormat = {
        problem: {
          locations: problemData.locations,
          num_vehicles: problemData.num_vehicles,
          depot_index: problemData.depot_index
        },
        algorithm: problemData.algorithm || 'SPSA',
        max_iterations: problemData.max_iterations || 100,
        additional_params: problemData.additional_params || {}
      }
      
      if (algorithmType === 'quantum') {
        return await apiClient.solveQuantum(originalFormat)
      } else {
        return await apiClient.solveClassical(originalFormat)
      }
    }
  } catch (error) {
    console.error('Problem solving failed:', error)
    throw error
  }
}

// Helper function for comparing algorithms with routing support
export const compareAlgorithms = async (problemData, selectedAlgorithms, useRouting = false) => {
  try {
    console.log('Comparing algorithms:', { problemData, selectedAlgorithms, useRouting })
    
    if (useRouting && problemData.routing_mode !== 'euclidean') {
      // For routing comparison, we'll need to call individual solve endpoints
      // since the comparison endpoint may not support routing yet
      const results = {
        quantum: {},
        classical: {},
        comparison: {
          timestamp: Date.now(),
          routing_used: true,
          routing_mode: problemData.routing_mode
        }
      }
      
      // Run quantum algorithms
      for (const optimizer of selectedAlgorithms.quantum) {
        try {
          const quantumData = {
            ...problemData,
            algorithm: optimizer
          }
          const result = await apiClient.solveQuantumWithRouting(quantumData)
          results.quantum[optimizer] = result.data
        } catch (error) {
          console.error(`Quantum ${optimizer} failed:`, error)
          results.quantum[optimizer] = { error: error.message, success: false }
        }
      }
      
      // Run classical algorithms
      for (const algorithm of selectedAlgorithms.classical) {
        try {
          const classicalData = {
            ...problemData,
            algorithm: algorithm
          }
          const result = await apiClient.solveClassicalWithRouting(classicalData)
          results.classical[algorithm] = result.data
        } catch (error) {
          console.error(`Classical ${algorithm} failed:`, error)
          results.classical[algorithm] = { error: error.message, success: false }
        }
      }
      
      return { data: results }
    } else {
      // Use original comparison endpoint
      const comparisonData = {
        problem: {
          locations: problemData.locations,
          num_vehicles: problemData.num_vehicles,
          depot_index: problemData.depot_index
        },
        quantum_optimizers: selectedAlgorithms.quantum,
        classical_algorithms: selectedAlgorithms.classical,
        max_iterations: problemData.max_iterations || 50
      }
      
      return await apiClient.compareAll(comparisonData)
    }
  } catch (error) {
    console.error('Algorithm comparison failed:', error)
    throw error
  }
}

export default api