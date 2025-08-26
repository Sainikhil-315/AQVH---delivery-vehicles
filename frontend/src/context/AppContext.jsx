import React, { createContext, useContext, useReducer } from 'react'

const AppContext = createContext()

const initialState = {
  currentProblem: {
    locations: [],
    num_vehicles: 2,
    depot_index: 0,
  },
  currentResults: null,
  isLoading: false,
  jobHistory: [],
  algorithms: {
    classical: ['nearest_neighbor', 'genetic_algorithm', 'simulated_annealing'],
    quantum: ['SPSA', 'COBYLA', 'ADAM', 'Powell']
  },
  selectedAlgorithms: {
    classical: ['nearest_neighbor'],
    quantum: ['SPSA']
  }
}

const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_PROBLEM':
      return { ...state, currentProblem: { ...state.currentProblem, ...action.payload } }
    case 'SET_RESULTS':
      return { ...state, currentResults: action.payload }
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
    case 'ADD_TO_HISTORY':
      return { 
        ...state, 
        jobHistory: [action.payload, ...state.jobHistory.slice(0, 19)] // Keep last 20
      }
    case 'SET_SELECTED_ALGORITHMS':
      return { 
        ...state, 
        selectedAlgorithms: { ...state.selectedAlgorithms, ...action.payload }
      }
    case 'RESET_PROBLEM':
      return { 
        ...state, 
        currentProblem: initialState.currentProblem,
        currentResults: null
      }
    default:
      return state
  }
}

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}