import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 240000, // 4 minutes for quantum algorithms
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
    console.log("✅ API Raw Response:", response.data)
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
  
  // Solve endpoints
  solveQuantum: (data) => api.post('/solve/quantum', data),
  solveClassical: (data) => api.post('/solve/classical', data),
  compareAll: (data) => api.post('/compare/all', data),
}

export default api