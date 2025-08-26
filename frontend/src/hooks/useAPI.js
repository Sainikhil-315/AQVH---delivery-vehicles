import { useState, useCallback } from 'react'
import { apiClient } from '../utils/api'
import toast from 'react-hot-toast'

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
      const data = response.data
      
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