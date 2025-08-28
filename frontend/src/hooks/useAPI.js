import { useState, useCallback } from 'react'
import { apiClient } from '../utils/api'
import toast from 'react-hot-toast'

const normalizeResults = (data) => {
  if (!data) return null
  return {
    algorithm: data.algorithm || null,
    cost: data.total_cost ?? data.cost ?? null,
    executionTime: data.execution_time ?? data.executionTime ?? null,
    routes: data.solution || [],
    valid: data.is_valid ?? data.valid ?? false,
    geometries: data.geometries || data.geometry || null,
    // optional fields
    iterations: data.iterations || null,
    qubits: data.num_qubits || null,
    pLayers: data.p_layers || null,
    shots: data.shots || null,
    validation: data.validation || null,
    problemInfo: data.problem_info || null,
    routing_info: data.routing_info || null
  }
}

export const useAPI = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(async (apiCall, options = {}) => {
    const { showToast = true, loadingMessage, successMessage } = options
    
    try {
      setLoading(true)
      setError(null)
      
      if (loadingMessage && showToast) {
        toast.loading(loadingMessage)
      }
      
      const response = await apiCall()
      const rawData = response.data?.data || response.data

      // Decide whether to normalize or not
      const data = (Array.isArray(rawData) || rawData?.quantum || rawData?.classical)
        ? rawData   // keep structured for compareAll or array results
        : normalizeResults(rawData)


      if (successMessage && showToast) {
        toast.dismiss()
        toast.success(successMessage)
      }
      
      return data
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred'
      setError(errorMessage)
      
      if (showToast) {
        toast.dismiss()
        toast.error(errorMessage)
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const solveQuantum = useCallback((problem, algorithm, params) => {
    return execute(
      () => apiClient.solveQuantum({
        problem,
        algorithm,
        max_iterations: params.maxIterations || 50,
        additional_params: {
          p_layers: params.pLayers || 2,
          shots: params.shots || 1024,
          ...params.additionalParams
        }
      }),
      {
        loadingMessage: 'Running quantum optimization...',
        successMessage: 'Quantum optimization completed!'
      }
    )
  }, [execute])

  const solveClassical = useCallback((problem, algorithm, params) => {
    return execute(
      () => apiClient.solveClassical({
        problem,
        algorithm,
        max_iterations: params.maxIterations || 100,
        ...params
      }),
      {
        loadingMessage: 'Running classical optimization...',
        successMessage: 'Classical optimization completed!'
      }
    )
  }, [execute])

  const compareAll = useCallback((problem, quantumAlgs, classicalAlgs, params) => {
    return execute(
      () => apiClient.compareAll({
        problem,
        quantum_optimizers: quantumAlgs,
        classical_algorithms: classicalAlgs,
        max_iterations: params.maxIterations || 30
      }),
      {
        loadingMessage: 'Comparing algorithms...',
        successMessage: 'Algorithm comparison completed!'
      }
    )
  }, [execute])

  return {
    loading,
    error,
    solveQuantum,
    solveClassical,
    compareAll,
    execute
  }
}
