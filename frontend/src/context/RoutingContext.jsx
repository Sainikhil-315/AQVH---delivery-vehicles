/**
 * Global routing configuration context for managing distance calculation modes.
 * Provides routing state and configuration throughout the application.
 */
import React, { createContext, useContext, useReducer, useEffect } from "react";

// Routing modes available in the application
export const RoutingModes = {
  EUCLIDEAN: "euclidean",
  OSRM: "osrm",
  OPENROUTE: "openroute",
  HYBRID: "hybrid",
}

// Routing services configuration
export const RoutingServices = {
  OSRM: {
    name: "OSRM",
    description: "Open Source Routing Machine",
    modes: [RoutingModes.OSRM],
    profiles: ["driving", "walking", "cycling"],
  },
  OPENROUTE: {
    name: "OpenRouteService",
    description: "OpenRouteService API",
    modes: [RoutingModes.OPENROUTE],
    profiles: ["driving", "walking", "cycling"],
  },
}

// Initial state for routing context
const initialState = {
  mode: RoutingModes.EUCLIDEAN,
  lastMode: RoutingModes.EUCLIDEAN,
  service: "osrm",
  profile: "driving",
  availableServices: {},
  serviceStatus: {},
  isLoading: false,
  error: null,
  enabled: false,
  comparison: {
    enabled: false,
    modes: [RoutingModes.EUCLIDEAN, RoutingModes.OSRM],
    results: {},
  },
  settings: {},
}

// Action types
const ActionTypes = {
  SET_MODE: "SET_MODE",
  SET_SERVICE: "SET_SERVICE",
  SET_PROFILE: "SET_PROFILE",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  SET_AVAILABLE_SERVICES: "SET_AVAILABLE_SERVICES",
  SET_SERVICE_STATUS: "SET_SERVICE_STATUS",
  TOGGLE_COMPARISON: "TOGGLE_COMPARISON",
  SET_COMPARISON_MODES: "SET_COMPARISON_MODES",
  SET_COMPARISON_RESULTS: "SET_COMPARISON_RESULTS",
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  RESET_STATE: "RESET_STATE",
  SET_ENABLED: "SET_ENABLED",
  SET_LAST_MODE: "SET_LAST_MODE"
}

// Reducer function
function routingReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_MODE:
      return {
        ...state,
        mode: action.payload,
        error: null,
      };

    case ActionTypes.SET_SERVICE:
      return {
        ...state,
        service: action.payload,
        error: null,
      };

    case ActionTypes.SET_PROFILE:
      return {
        ...state,
        profile: action.payload,
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload,
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case ActionTypes.SET_AVAILABLE_SERVICES:
      return {
        ...state,
        availableServices: action.payload,
      };

    case ActionTypes.SET_SERVICE_STATUS:
      return {
        ...state,
        serviceStatus: {
          ...state.serviceStatus,
          [action.payload.service]: action.payload.status,
        },
      };

    case ActionTypes.TOGGLE_COMPARISON:
      return {
        ...state,
        comparison: {
          ...state.comparison,
          enabled: !state.comparison.enabled,
        },
      };

    case ActionTypes.SET_COMPARISON_MODES:
      return {
        ...state,
        comparison: {
          ...state.comparison,
          modes: action.payload,
        },
      };

    case ActionTypes.SET_COMPARISON_RESULTS:
      return {
        ...state,
        comparison: {
          ...state.comparison,
          results: action.payload,
        },
      };

    case ActionTypes.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case ActionTypes.RESET_STATE:
      return initialState;

    default:
      return state;
  }
}

// Create context
const RoutingContext = createContext();

// Custom hook to use routing context
export const useRouting = () => {
  const context = useContext(RoutingContext);
  if (!context) {
    throw new Error("useRouting must be used within a RoutingProvider");
  }
  return context;
};

// Routing provider component
export const RoutingProvider = ({ children }) => {
  // fast refresh hmr - default instead of const might work
  const [state, dispatch] = useReducer(routingReducer, initialState);

  // Action creators
  const actions = {
    setMode: (mode) => {
      dispatch({ type: ActionTypes.SET_MODE, payload: mode });
      // Save to localStorage
      localStorage.setItem("routing_mode", mode);
    },

    setService: (service) => {
      dispatch({ type: ActionTypes.SET_SERVICE, payload: service });
      localStorage.setItem("routing_service", service);
    },

    setProfile: (profile) => {
      dispatch({ type: ActionTypes.SET_PROFILE, payload: profile });
      localStorage.setItem("routing_profile", profile);
    },

    setLoading: (loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    },

    setError: (error) => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: error });
    },

    setAvailableServices: (services) => {
      dispatch({ type: ActionTypes.SET_AVAILABLE_SERVICES, payload: services });
    },

    setServiceStatus: (service, status) => {
      dispatch({
        type: ActionTypes.SET_SERVICE_STATUS,
        payload: { service, status },
      });
    },

    toggleComparison: () => {
      dispatch({ type: ActionTypes.TOGGLE_COMPARISON });
    },

    setComparisonModes: (modes) => {
      dispatch({ type: ActionTypes.SET_COMPARISON_MODES, payload: modes });
    },

    setComparisonResults: (results) => {
      dispatch({ type: ActionTypes.SET_COMPARISON_RESULTS, payload: results });
    },

    updateSettings: (settings) => {
      dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings });
      // Save to localStorage
      const currentSettings = JSON.parse(
        localStorage.getItem("routing_settings") || "{}"
      );
      const updatedSettings = { ...currentSettings, ...settings };
      localStorage.setItem("routing_settings", JSON.stringify(updatedSettings));
    },

    resetState: () => {
      dispatch({ type: ActionTypes.RESET_STATE });
      // Clear localStorage
      localStorage.removeItem("routing_mode");
      localStorage.removeItem("routing_service");
      localStorage.removeItem("routing_profile");
      localStorage.removeItem("routing_settings");
    },
  };

  // Load saved settings from localStorage on mount
   // Load saved settings on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("routing_mode")
    const savedService = localStorage.getItem("routing_service")
    const savedProfile = localStorage.getItem("routing_profile")
    const savedEnabled = localStorage.getItem("routing_enabled")
    const savedSettings = localStorage.getItem("routing_settings")

    if (savedMode) dispatch({ type: ActionTypes.SET_MODE, payload: savedMode })
    if (savedService) dispatch({ type: ActionTypes.SET_SERVICE, payload: savedService })
    if (savedProfile) dispatch({ type: ActionTypes.SET_PROFILE, payload: savedProfile })
    if (savedEnabled) dispatch({ type: ActionTypes.SET_ENABLED, payload: savedEnabled === "1" })
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        dispatch({ type: ActionTypes.UPDATE_SETTINGS, payload: settings })
      } catch (err) {
        console.warn("Failed to parse saved routing settings:", err)
      }
    }
  }, [])

  // Fetch available services on mount
  // Fetch available services on mount (use env-aware base)
  useEffect(() => {
    const fetchAvailableServices = async () => {
      try {
        actions.setLoading(true)
        const base = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const res = await fetch(`${base}/routing/services`)
        if (res.ok) {
          const services = await res.json()
          actions.setAvailableServices(services)
        }
      } catch (error) {
        console.warn("Failed to fetch routing services:", error)
      } finally {
        actions.setLoading(false)
      }
    }
    fetchAvailableServices()
  }, [])

  const contextValue = {
    routingState: {
      enabled: state.enabled, // <-- fixed
      mode: state.mode,
      service: state.service,
      profile: state.profile,
      availableServices: state.availableServices,
      serviceStatus: state.serviceStatus,
      settings: state.settings,
      isLoading: state.isLoading,
      error: state.error,
    },

    updateRoutingConfig: (updates) => {
      if ("mode" in updates) actions.setMode(updates.mode);
      if ("service" in updates) actions.setService(updates.service);
      if ("profile" in updates) actions.setProfile(updates.profile);
      if ("enabled" in updates) {
        // persist toggle value
        state.enabled = updates.enabled;

        if (updates.enabled) {
          // turn ON → default to OSRM if available
          actions.setMode(RoutingModes.ROAD_OSRM);
        } else {
          // turn OFF → always fallback to Euclidean
          actions.setMode(RoutingModes.EUCLIDEAN);
        }
      }
      if ("settings" in updates) actions.updateSettings(updates.settings);
    },

    ...state,
    ...actions,

    isRoadRoutingMode: state.mode !== RoutingModes.EUCLIDEAN,
    currentServiceConfig: state.availableServices[state.service] || null,
    canUseRoadRouting: Object.keys(state.availableServices).length > 0,
  };

  return (
    <RoutingContext.Provider value={contextValue}>
      {children}
    </RoutingContext.Provider>
  );
};

export { RoutingContext };
