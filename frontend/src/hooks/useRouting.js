/**
 * Custom hook for routing functionality and API integration.
 * Provides utilities for distance calculations, service management, and routing operations.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouting as useRoutingContext } from '../context/RoutingContext';
import { api } from '../utils/api';
import { routingUtils } from '../utils/routingUtils';

export const useRouting = () => {
  return useRoutingContext();
};

// Hook for routing API operations
export const useRoutingAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Helper to obtain default service/profile (persisted or fallback)
  const _getDefaultServiceProfile = (opts = {}) => {
    const persisted = JSON.parse(localStorage.getItem('routing_settings') || '{}')
    const service = opts.service || persisted.service || 'osrm'
    const profile = opts.profile || persisted.profile || 'driving'
    return { service, profile }
  }

  const calculateRoute = useCallback(async (start, end, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Build payload shape backend expects: { service, profile, coordinates: [[lat,lng],[lat,lng]] }
      const { service, profile } = _getDefaultServiceProfile(options)

      const payload = {
        service,
        profile,
        coordinates: [start, end],
        ...options
      }

      const response = await api.post('/routing/route', payload, {
        signal: abortControllerRef.current.signal
      })

      return response.data
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.message || err.message)
        throw err
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const calculateDistanceMatrix = useCallback(async (locations, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // support options.mode mapping -> service (frontend may pass mode like 'osrm' or 'openroute')
      let payload = { locations, ...options }
      if (options.mode) {
        // map mode to service name expected by backend
        if (options.mode === 'osrm' || options.mode === 'road_osrm') {
          payload.service = options.service || 'osrm'
        } else if (options.mode === 'openroute' || options.mode === 'road_openroute') {
          payload.service = options.service || 'openroute'
        } else {
          // if euclidean or unknown, don't set service
        }
      }

      // If explicit service/profile provided, ensure they are present
      const defaults = _getDefaultServiceProfile(options)
      if (!payload.service) payload.service = defaults.service
      if (!payload.profile) payload.profile = defaults.profile

      const response = await api.post('/routing/matrix', payload, {
        signal: abortControllerRef.current.signal
      })

      return response.data
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.response?.data?.message || err.message);
        throw err;
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const testServiceConnection = useCallback(async (service) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/routing/test/${service}`);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const getAvailableServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/routing/services');
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cancel ongoing requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    loading,
    error,
    calculateRoute,
    calculateDistanceMatrix,
    testServiceConnection,
    getAvailableServices,
    clearError: () => setError(null)
  };
};

// Hook for routing comparison functionality
export const useRoutingComparison = () => {
  const { comparison, setComparisonResults } = useRouting();
  const { calculateDistanceMatrix } = useRoutingAPI();
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState({});

  const runComparison = useCallback(async (locations) => {
    if (!comparison.enabled || comparison.modes.length < 2) {
      return;
    }

    setIsComparing(true);
    const results = {};

    try {
      // Run calculations for each selected mode
      for (const mode of comparison.modes) {
        const startTime = performance.now();

        try {
          const matrix = await calculateDistanceMatrix(locations, { mode });
          const endTime = performance.now();

          results[mode] = {
            matrix,
            executionTime: endTime - startTime,
            status: 'success',
            totalDistance: routingUtils.calculateTotalDistance(matrix),
            averageDistance: routingUtils.calculateAverageDistance(matrix)
          };
        } catch (error) {
          results[mode] = {
            matrix: null,
            executionTime: 0,
            status: 'error',
            error: error.message
          };
        }
      }

      setComparisonData(results);
      setComparisonResults(results);

      return results;
    } catch (error) {
      console.error('Comparison failed:', error);
      throw error;
    } finally {
      setIsComparing(false);
    }
  }, [comparison, calculateDistanceMatrix, setComparisonResults]);

  const getComparisonSummary = useCallback(() => {
    if (Object.keys(comparisonData).length < 2) {
      return null;
    }

    const modes = Object.keys(comparisonData);
    const summary = {
      fastest: null,
      shortest: null,
      differences: {}
    };

    // Find fastest execution
    let fastestTime = Infinity;
    let shortestDistance = Infinity;

    modes.forEach(mode => {
      const data = comparisonData[mode];
      if (data.status === 'success') {
        if (data.executionTime < fastestTime) {
          fastestTime = data.executionTime;
          summary.fastest = mode;
        }
        if (data.totalDistance < shortestDistance) {
          shortestDistance = data.totalDistance;
          summary.shortest = mode;
        }
      }
    });

    // Calculate differences between modes
    for (let i = 0; i < modes.length; i++) {
      for (let j = i + 1; j < modes.length; j++) {
        const mode1 = modes[i];
        const mode2 = modes[j];
        const data1 = comparisonData[mode1];
        const data2 = comparisonData[mode2];

        if (data1.status === 'success' && data2.status === 'success') {
          const key = `${mode1}_vs_${mode2}`;
          summary.differences[key] = {
            distanceDiff: Math.abs(data1.totalDistance - data2.totalDistance),
            timeDiff: Math.abs(data1.executionTime - data2.executionTime),
            distanceRatio: data1.totalDistance / data2.totalDistance,
            timeRatio: data1.executionTime / data2.executionTime
          };
        }
      }
    }

    return summary;
  }, [comparisonData]);

  return {
    isComparing,
    comparisonData,
    runComparison,
    getComparisonSummary,
    clearComparison: () => {
      setComparisonData({});
      setComparisonResults({});
    }
  };
};

// Hook for routing service status monitoring
export const useServiceStatus = () => {
  const { serviceStatus, setServiceStatus } = useRouting();
  const { testServiceConnection } = useRoutingAPI();
  const [isChecking, setIsChecking] = useState(false);

  const checkService = useCallback(async (service) => {
    setIsChecking(true);
    try {
      const result = await testServiceConnection(service);
      const status = result.success ? 'ready' : 'error';
      setServiceStatus(service, {
        ...status,
        lastChecked: new Date().toISOString(),
        details: result
      });
      return result;
    } catch (error) {
      setServiceStatus(service, {
        status: 'error',
        lastChecked: new Date().toISOString(),
        error: error.message
      });
      throw error;
    } finally {
      setIsChecking(false);
    }
  }, [testServiceConnection, setServiceStatus]);

  const checkAllServices = useCallback(async (services) => {
    setIsChecking(true);
    const results = {};

    try {
      await Promise.all(
        services.map(async (service) => {
          try {
            results[service] = await checkService(service);
          } catch (error) {
            results[service] = { success: false, error: error.message };
          }
        })
      );
      return results;
    } finally {
      setIsChecking(false);
    }
  }, [checkService]);

  const getServiceHealth = useCallback((service) => {
    const status = serviceStatus[service];
    if (!status) return 'unknown';

    const lastChecked = new Date(status.lastChecked);
    const now = new Date();
    const timeDiff = now - lastChecked;

    // Status is stale after 5 minutes
    if (timeDiff > 5 * 60 * 1000) {
      return 'stale';
    }

    return status.status || 'unknown';
  }, [serviceStatus]);

  return {
    isChecking,
    checkService,
    checkAllServices,
    getServiceHealth
  };
};

export default useRouting;