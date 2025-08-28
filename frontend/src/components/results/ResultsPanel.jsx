import React, { useContext } from "react";
import { CheckCircle, AlertCircle, Clock, TrendingUp, MapPin, Zap, Map } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import RouteDetails from "./RouteDetails";
import Statistics from "./Statistics";
import ExportOptions from "./ExportOptions";
import RoutingMetrics from "./RoutingMetrics";
import {
  formatDistance,
  formatDuration,
  formatAlgorithmName,
} from "../../utils/formatters";
import { RoutingContext } from "../../context/RoutingContext";

const ResultsPanel = ({ results, onExport }) => {
  const { routingState } = useContext(RoutingContext);  
  if (!results) {
    return (
      <Card>
        <Card.Content className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Results Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Run an optimization to see results here.
          </p>
        </Card.Content>
      </Card>
    );
  }

  const { algorithm, cost, executionTime, routes, valid, qubits, iterations, routing_info } = results;
  
  // Determine if this is a routing-enhanced result
  const hasRouting = routing_info && routing_info.routing_mode !== 'euclidean';
  const isQuantumResult = routing_info?.algorithm === 'quantum' || qubits;

  return (
    <div className="space-y-6">
      {/* Header with Algorithm and Routing Info */}
      <Card>
        <Card.Content className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatAlgorithmName(algorithm)}
                </h2>
                <Badge variant={valid ? "success" : "danger"}>
                  {valid ? "Valid Solution" : "Invalid Solution"}
                </Badge>
                {isQuantumResult && (
                  <Badge variant="quantum">
                    Quantum
                  </Badge>
                )}
                {hasRouting && (
                  <Badge variant="info">
                    Road Routing
                  </Badge>
                )}
              </div>

              {/* Routing Information Banner */}
              {hasRouting && (
                <div className="flex items-center space-x-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div className="flex items-center space-x-6 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Routing Mode:</span>
                      <span className="ml-2 font-medium text-blue-700 dark:text-blue-300">
                        {routing_info.routing_mode.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Service:</span>
                      <span className="ml-2 font-medium text-blue-700 dark:text-blue-300">
                        {routing_info.routing_service}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Profile:</span>
                      <span className="ml-2 font-medium text-blue-700 dark:text-blue-300">
                        {routing_info.routing_profile || 'driving'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-primary-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Total {hasRouting ? 'Distance' : 'Cost'}
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {hasRouting ? `${cost.toFixed(2)} km` : formatDistance(cost)}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-primary-600" />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Execution Time
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatDuration(executionTime)}
                  </p>
                </div>

                {qubits && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Zap className="h-4 w-4 text-quantum-600" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Qubits Used
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-quantum-600">
                      {qubits}
                    </p>
                  </div>
                )}

                {iterations && (
                  <div className="space-y-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Iterations
                    </span>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {iterations}
                    </p>
                  </div>
                )}

                {hasRouting && routing_info.total_api_calls && (
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Map className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        API Calls
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-blue-600">
                      {routing_info.total_api_calls}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <CheckCircle
                className={`h-6 w-6 ${
                  valid ? "text-green-500" : "text-red-500"
                }`}
              />
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Routing Metrics - Show only if routing was used */}
      {hasRouting && <RoutingMetrics routingInfo={routing_info} />}

      {/* Route Details */}
      {routes && routes.length > 0 && (
        <RouteDetails 
          routes={routes} 
          routingInfo={hasRouting ? routing_info : null}
        />
      )}

      {/* Statistics */}
      <Statistics 
        results={results} 
        routingEnabled={hasRouting}
      />

      {/* Export Options */}
      <ExportOptions 
        results={results} 
        onExport={onExport}
        includeRouting={hasRouting}
      />
    </div>
  );
};

export default ResultsPanel;