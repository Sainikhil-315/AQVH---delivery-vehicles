import React, { createContext, useContext, useReducer } from "react";

const AppContext = createContext();

const initialState = {
  currentProblem: {
    locations: [],
    num_vehicles: 2,
    depot_index: 0,
    // New routing-related fields
    routing_mode: "euclidean",
    routing_service: "osrm",
    routing_profile: "driving",
  },
  currentResults: null,
  isLoading: false,
  jobHistory: [],
  algorithms: {
    classical: ["nearest_neighbor", "genetic_algorithm", "simulated_annealing"],
    quantum: ["SPSA", "COBYLA", "ADAM", "Powell"],
  },
  selectedAlgorithms: {
    classical: ["nearest_neighbor"],
    quantum: ["SPSA"],
  },
  // New routing state
  routing: {
    enabled: false,
    availableServices: [],
    serviceStatus: {},
    lastRoutingTest: null,
  },
};

const appReducer = (state, action) => {
  switch (action.type) {
    case "SET_PROBLEM":
      return {
        ...state,
        currentProblem: { ...state.currentProblem, ...action.payload },
      };

    case "SET_ROUTING_PROBLEM":
      // Handle routing-specific problem updates
      return {
        ...state,
        currentProblem: {
          ...state.currentProblem,
          ...action.payload,
          // Ensure routing fields are properly handled
          routing_mode:
            action.payload.routing_mode || state.currentProblem.routing_mode,
          routing_service:
            action.payload.routing_service ||
            state.currentProblem.routing_service,
          routing_profile:
            action.payload.routing_profile ||
            state.currentProblem.routing_profile,
        },
      };

    case "SET_RESULTS":
      const data = action.payload || {};
      console.log("📥 [AppContext] Raw result payload:", data);

      // Check if this is a comparison result (has quantum/classical structure)
      if (data.quantum || data.classical) {
        console.log("📦 [AppContext] Comparison result detected");
        
        // Extract geometries from the first successful result for RouteMap
        let geometries = null;
        
        // Check classical results first
        if (data.classical) {
          for (const [algoName, result] of Object.entries(data.classical)) {
            if (result && !result.error && result.geometries) {
              console.log(`🔍 [AppContext] Found geometries in classical.${algoName}`);
              geometries = result.geometries;
              break;
            }
          }
        }
        
        // If no classical geometries found, check quantum
        if (!geometries && data.quantum) {
          for (const [algoName, result] of Object.entries(data.quantum)) {
            if (result && !result.error && result.geometries) {
              console.log(`🔍 [AppContext] Found geometries in quantum.${algoName}`);
              geometries = result.geometries;
              break;
            }
          }
        }
        
        console.log("🎯 [AppContext] Final geometries extracted:", geometries);
        
        return {
          ...state,
          currentResults: {
            ...data, // Store the full comparison structure
            geometries: geometries, // Add extracted geometries at top level for RouteMap
          },
        };
      }

      // Handle single algorithm result (including routing results)
      return {
        ...state,
        currentResults: {
          algorithm: data.algorithm || "Unknown",
          cost: data.cost ?? 0,
          executionTime: data.executionTime ?? 0,
          iterations: data.iterations ?? 0,
          pLayers: data.pLayers ?? null,
          problemInfo: data.problemInfo ?? null,
          qubits: data.qubits ?? null,
          routes: data.routes || data.solution || [], // Handle both 'routes' and 'solution' fields
          geometries: data.geometries || null, // Store geometries
          shots: data.shots ?? null,
          valid: data.valid ?? false,
          validation: data.validation ?? null,
          routing_info: data.routing_info || null,
          distance_matrix_source:
            data.routing_info?.distance_matrix_source || "euclidean",
        },
      };

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "ADD_TO_HISTORY":
      return {
        ...state,
        jobHistory: [action.payload, ...state.jobHistory.slice(0, 19)],
      };

    case "SET_SELECTED_ALGORITHMS":
      return {
        ...state,
        selectedAlgorithms: { ...state.selectedAlgorithms, ...action.payload },
      };

    case "RESET_PROBLEM":
      return {
        ...state,
        currentProblem: initialState.currentProblem,
        currentResults: null,
      };

    case "SET_JOB_HISTORY":
      return {
        ...state,
        jobHistory: action.payload,
      };

    case "CLEAR_HISTORY":
      return {
        ...state,
        jobHistory: [],
      };

    // New routing-specific actions
    case "SET_ROUTING_ENABLED":
      return {
        ...state,
        routing: {
          ...state.routing,
          enabled: action.payload,
        },
      };

    case "SET_ROUTING_SERVICES":
      return {
        ...state,
        routing: {
          ...state.routing,
          availableServices: action.payload,
        },
      };

    case "SET_SERVICE_STATUS":
      return {
        ...state,
        routing: {
          ...state.routing,
          serviceStatus: {
            ...state.routing.serviceStatus,
            ...action.payload,
          },
        },
      };

    case "SET_ROUTING_TEST_RESULT":
      return {
        ...state,
        routing: {
          ...state.routing,
          lastRoutingTest: {
            service: action.payload.service,
            success: action.payload.success,
            timestamp: Date.now(),
            error: action.payload.error,
          },
        },
      };

    default:
      return state;
  }
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Helper functions for routing actions
  const routingActions = {
    setRoutingEnabled: (enabled) => {
      dispatch({ type: "SET_ROUTING_ENABLED", payload: enabled });
    },

    setRoutingServices: (services) => {
      dispatch({ type: "SET_ROUTING_SERVICES", payload: services });
    },

    setServiceStatus: (statusUpdate) => {
      dispatch({ type: "SET_SERVICE_STATUS", payload: statusUpdate });
    },

    setRoutingTestResult: (result) => {
      dispatch({ type: "SET_ROUTING_TEST_RESULT", payload: result });
    },

    setRoutingProblem: (problemUpdate) => {
      dispatch({ type: "SET_ROUTING_PROBLEM", payload: problemUpdate });
    },
  };

  const value = {
    state,
    dispatch,
    ...routingActions,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Export the context itself for direct usage in components
export { AppContext };