/**
 * Routing metrics display component.
 * Shows detailed routing performance metrics and statistics.
 */
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useRouting } from '../../context/RoutingContext';
import { routingUtils } from '../../utils/routingUtils';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const RoutingMetrics = ({ vrpResults, distanceMatrix, className = '' }) => {
  const { mode, service, comparison } = useRouting();

  // Calculate routing-specific metrics
  const metrics = useMemo(() => {
    if (!vrpResults || !distanceMatrix) {
      return null;
    }

    const totalDistance = routingUtils.calculateTotalDistance(distanceMatrix);
    const avgDistance = routingUtils.calculateAverageDistance(distanceMatrix);
    const shortestRoute = routingUtils.findShortestRoute(distanceMatrix);

    // Calculate route efficiency (actual vs optimal)
    const routeDistance = vrpResults.routes?.reduce((total, route) => {
      return total + routingUtils.calculateRouteDistance(route, distanceMatrix);
    }, 0) || 0;

    const efficiency = shortestRoute.distance > 0 ? (shortestRoute.distance / routeDistance) * 100 : 0;

    return {
      totalDistance,
      avgDistance,
      shortestRoute,
      routeDistance,
      efficiency: Math.min(100, efficiency),
      numRoutes: vrpResults.routes?.length || 0,
      numLocations: distanceMatrix.length,
      routingMode: mode,
      service: service
    };
  }, [vrpResults, distanceMatrix, mode, service]);

  // Prepare chart data for distance distribution
  const distanceDistribution = useMemo(() => {
    if (!distanceMatrix) return [];

    const distances = [];
    for (let i = 0; i < distanceMatrix.length; i++) {
      for (let j = i + 1; j < distanceMatrix.length; j++) {
        distances.push(distanceMatrix[i][j]);
      }
    }

    // Create histogram bins
    const max = Math.max(...distances);
    const min = Math.min(...distances);
    const binCount = 8;
    const binSize = (max - min) / binCount;
    
    const bins = Array(binCount).fill(0).map((_, i) => ({
      range: `${routingUtils.formatDistance(min + i * binSize)} - ${routingUtils.formatDistance(min + (i + 1) * binSize)}`,
      count: 0,
      minValue: min + i * binSize,
      maxValue: min + (i + 1) * binSize
    }));

    distances.forEach(dist => {
      const binIndex = Math.min(Math.floor((dist - min) / binSize), binCount - 1);
      bins[binIndex].count++;
    });

    return bins;
  }, [distanceMatrix]);

  // Route efficiency data for comparison
  const routeEfficiencyData = useMemo(() => {
    if (!vrpResults?.routes || !distanceMatrix) return [];

    return vrpResults.routes.map((route, index) => ({
      route: `Route ${index + 1}`,
      distance: routingUtils.calculateRouteDistance(route, distanceMatrix),
      locations: route.length
    }));
  }, [vrpResults, distanceMatrix]);

  if (!metrics) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No routing metrics available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Routing Performance Metrics
        </h3>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary">
            {metrics.routingMode === 'euclidean' ? 'Straight Line' : `Road (${metrics.service})`}
          </Badge>
          {comparison.enabled && (
            <Badge variant="info">Comparison Mode</Badge>
          )}
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Distance</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {routingUtils.formatDistance(metrics.totalDistance)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Distance</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {routingUtils.formatDistance(metrics.avgDistance)}
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Efficiency</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {metrics.efficiency.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Routes</div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {metrics.numRoutes}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distance Distribution */}
        <Card className="p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Distance Distribution
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distanceDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ range, percent }) => `${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {distanceDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 60%)`} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name, props) => [value, props.payload.range]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Route Efficiency */}
        <Card className="p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Route Distances
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={routeEfficiencyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="route" />
                <YAxis />
                <Tooltip formatter={(value) => routingUtils.formatDistance(value)} />
                <Line type="monotone" dataKey="distance" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Detailed Statistics */}
      <Card className="p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Routing Statistics
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Distance Metrics</h5>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Total Distance:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {routingUtils.formatDistance(metrics.totalDistance)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Average Distance:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {routingUtils.formatDistance(metrics.avgDistance)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Shortest Route:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {routingUtils.formatDistance(metrics.shortestRoute.distance)}
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Route Analysis</h5>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Number of Routes:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.numRoutes}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Locations:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.numLocations}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Efficiency:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.efficiency.toFixed(1)}%
                </dd>
              </div>
            </dl>
          </div>

          <div>
            <h5 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Routing Method</h5>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Mode:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.routingMode === 'euclidean' ? 'Straight Line' : 'Road Routing'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Service:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {metrics.service?.toUpperCase() || 'N/A'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-600 dark:text-gray-400">Comparison:</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {comparison.enabled ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      {/* Performance Insights */}
      {metrics.routingMode !== 'euclidean' && (
        <Card className="p-6">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
            Road Routing Insights
          </h4>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Realistic Distances:</strong> Road routing provides accurate vehicle-traversable distances 
                  compared to straight-line calculations.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>Route Optimization:</strong> Road networks may reveal more efficient routing patterns 
                  than Euclidean distance suggests.
                </p>
              </div>
            </div>
            
            {metrics.efficiency < 70 && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Optimization Opportunity:</strong> Current efficiency is {metrics.efficiency.toFixed(1)}%. 
                    Consider route reordering or different optimization algorithms.
                  </p>
                </div>
              </div>
            )}
            
            {metrics.efficiency >= 85 && (
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>High Efficiency:</strong> Routes are well-optimized with {metrics.efficiency.toFixed(1)}% efficiency.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default RoutingMetrics;