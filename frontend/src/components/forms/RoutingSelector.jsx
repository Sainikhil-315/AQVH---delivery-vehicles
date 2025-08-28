/**
 * Routing mode selector component for switching between Euclidean and road-based routing.
 * Allows users to choose routing service, profile, and comparison options.
 */
import React, { useState, useEffect } from 'react';
import { useRouting, RoutingModes, RoutingServices } from '../../context/RoutingContext';

const RoutingSelector = ({ className = '', disabled = false }) => {
  const {
    mode,
    service,
    profile,
    availableServices,
    serviceStatus,
    isLoading,
    comparison,
    setMode,
    setService,
    setProfile,
    toggleComparison,
    setComparisonModes
  } = useRouting();

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get display name for routing mode
  const getModeDisplayName = (routingMode) => {
    switch (routingMode) {
      case RoutingModes.EUCLIDEAN:
        return 'Straight Line (Euclidean)';
      case RoutingModes.ROAD_OSRM:
        return 'Road Routing (OSRM)';
      case RoutingModes.ROAD_OPENROUTE:
        return 'Road Routing (OpenRoute)';
      case RoutingModes.HYBRID:
        return 'Hybrid (Road + Fallback)';
      default:
        return routingMode;
    }
  };

  // Get status indicator for service
  const getServiceStatusIcon = (serviceName) => {
    const status = serviceStatus[serviceName] || 'unknown';
    switch (status) {
      case 'ready':
        return '🟢';
      case 'error':
        return '🔴';
      case 'limited':
        return '🟡';
      default:
        return '⚪';
    }
  };

  // Handle mode change
  const handleModeChange = (newMode) => {
    setMode(newMode);
    
    // Auto-select appropriate service for road routing
    if (newMode === RoutingModes.ROAD_OSRM) {
      setService('osrm');
    } else if (newMode === RoutingModes.ROAD_OPENROUTE) {
      setService('openroute');
    }
  };

  // Handle comparison mode selection
  const handleComparisonModeChange = (selectedModes) => {
    setComparisonModes(selectedModes);
  };

  return (
    <div className={`routing-selector ${className}`}>
      {/* Main Mode Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Distance Calculation Method
        </label>
        <div className="space-y-2">
          {Object.values(RoutingModes).map((routingMode) => (
            <div key={routingMode} className="flex items-center">
              <input
                type="radio"
                id={`mode-${routingMode}`}
                name="routing-mode"
                value={routingMode}
                checked={mode === routingMode}
                onChange={(e) => handleModeChange(e.target.value)}
                disabled={disabled || isLoading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label 
                htmlFor={`mode-${routingMode}`}
                className="ml-2 text-sm text-gray-900 dark:text-gray-100 flex items-center"
              >
                {getModeDisplayName(routingMode)}
                {routingMode !== RoutingModes.EUCLIDEAN && (
                  <span className="ml-2 text-xs">
                    {getServiceStatusIcon(service)}
                  </span>
                )}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Road Routing Options */}
      {mode !== RoutingModes.EUCLIDEAN && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Road Routing Configuration
          </h4>
          
          {/* Service Selection */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Routing Service
            </label>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              disabled={disabled || isLoading}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {Object.entries(availableServices).map(([key, config]) => (
                <option key={key} value={key}>
                  {getServiceStatusIcon(key)} {config.name}
                  {config.status === 'demo_server_limited' && ' (Limited)'}
                  {config.status === 'missing_api_key' && ' (No API Key)'}
                </option>
              ))}
            </select>
          </div>

          {/* Profile Selection */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Vehicle Profile
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
              disabled={disabled || isLoading}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="driving">🚗 Driving</option>
              <option value="walking">🚶 Walking</option>
              <option value="cycling">🚴 Cycling</option>
              {service === 'osrm' && <option value="truck">🚛 Truck</option>}
            </select>
          </div>

          {/* Service Status Info */}
          {availableServices[service] && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>Base URL: {availableServices[service].base_url}</div>
              <div>Rate Limit: {availableServices[service].rate_limit}/min</div>
              <div>Max Matrix Size: {availableServices[service].max_matrix_size}</div>
            </div>
          )}
        </div>
      )}

      {/* Comparison Mode Toggle */}
      <div className="mb-4">
        <div className="flex items-center">
          <input
            type="checkbox"
            id="comparison-mode"
            checked={comparison.enabled}
            onChange={toggleComparison}
            disabled={disabled || isLoading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label 
            htmlFor="comparison-mode"
            className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Compare Routing Methods
          </label>
        </div>
        
        {comparison.enabled && (
          <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
              Select methods to compare:
            </label>
            <div className="space-y-1">
              {Object.values(RoutingModes).map((routingMode) => (
                <div key={routingMode} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`compare-${routingMode}`}
                    checked={comparison.modes.includes(routingMode)}
                    onChange={(e) => {
                      const newModes = e.target.checked
                        ? [...comparison.modes, routingMode]
                        : comparison.modes.filter(m => m !== routingMode);
                      handleComparisonModeChange(newModes);
                    }}
                    disabled={disabled || isLoading}
                    className="h-3 w-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label 
                    htmlFor={`compare-${routingMode}`}
                    className="ml-2 text-xs text-gray-700 dark:text-gray-300"
                  >
                    {getModeDisplayName(routingMode)}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      <div className="border-t pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          disabled={disabled}
        >
          <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>
            ▶
          </span>
          <span className="ml-1">Advanced Settings</span>
        </button>
        
        {showAdvanced && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Cache Enabled</span>
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Fallback to Euclidean</span>
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Route Geometry</span>
              <span className="text-green-600 dark:text-green-400">✓</span>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-3 text-center">
          <div className="inline-flex items-center text-sm text-gray-500">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Loading routing services...
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutingSelector;