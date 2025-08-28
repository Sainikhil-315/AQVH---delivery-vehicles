/**
 * Routing comparison visualization component.
 * Displays side-by-side comparison of different routing methods.
 */
import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useRoutingComparison } from '../../hooks/useRouting';
import { routingUtils } from '../../utils/routingUtils';
import Card from '../ui/Card';
import Button from '../ui/Button';

const RoutingComparison = ({ locations, onRunComparison, className = '' }) => {
  const { isComparing, comparisonData, runComparison, getComparisonSummary, clearComparison } = useRoutingComparison();
  const [selectedMetric, setSelectedMetric] = useState('distance');
  
  const summary = useMemo(() => getComparisonSummary(), [getComparisonSummary]);
  
  const chartData = useMemo(() => {
    return Object.entries(comparisonData).map(([method, data]) => ({
      method: method.replace('_', ' ').toUpperCase(),
      distance: data.status === 'success' ? data.totalDistance : 0,
      time: data.status === 'success' ? data.executionTime : 0,
      status: data.status
    }));
  }, [comparisonData]);

  const handleRunComparison = async () => {
    try {
      await runComparison(locations);
      if (onRunComparison) {
        onRunComparison(comparisonData);
      }
    } catch (error) {
      console.error('Comparison failed:', error);
    }
  };

  const getMethodDisplayName = (method) => {
    const names = {
      'euclidean': 'Straight Line',
      'road_osrm': 'OSRM Roads',
      'road_openroute': 'OpenRoute Roads',
      'hybrid': 'Hybrid Mode'
    };
    return names[method] || method;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'loading': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'loading': return '⏳';
      default: return '⚪';
    }
  };

  if (Object.keys(comparisonData).length === 0) {
    return (
      <Card className={`${className}`}>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No Comparison Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Run a comparison to see performance differences between routing methods.
          </p>
          <Button
            onClick={handleRunComparison}
            disabled={!locations || locations.length < 2 || isComparing}
            className="inline-flex items-center"
          >
            {isComparing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running Comparison...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Run Comparison
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Routing Method Comparison
        </h3>
        <div className="flex items-center space-x-4">
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setSelectedMetric('distance')}
              className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                selectedMetric === 'distance'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:border-blue-600 dark:text-blue-300'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              Distance
            </button>
            <button
              onClick={() => setSelectedMetric('time')}
              className={`px-4 py-2 text-sm font-medium rounded-r-md border-l-0 border ${
                selectedMetric === 'time'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:border-blue-600 dark:text-blue-300'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              Speed
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunComparison}
            disabled={isComparing}
          >
            Re-run
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearComparison}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Fastest</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {summary.fastest ? getMethodDisplayName(summary.fastest) : 'N/A'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Shortest Distance</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {summary.shortest ? getMethodDisplayName(summary.shortest) : 'N/A'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Methods Compared</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {Object.keys(comparisonData).length}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-2">
            {selectedMetric === 'distance' ? 'Total Distance Comparison' : 'Execution Time Comparison'}
          </h4>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  selectedMetric === 'distance' 
                    ? routingUtils.formatDistance(value)
                    : routingUtils.formatDuration(value / 1000),
                  selectedMetric === 'distance' ? 'Distance' : 'Time'
                ]}
              />
              <Bar 
                dataKey={selectedMetric} 
                fill={selectedMetric === 'distance' ? '#3B82F6' : '#10B981'}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed Results Table */}
      <Card className="p-6">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100 mb-4">
          Detailed Results
        </h4>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Avg Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Execution Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {Object.entries(comparisonData).map(([method, data]) => (
                <tr key={method}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                    {getMethodDisplayName(method)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex items-center ${getStatusColor(data.status)}`}>
                      {getStatusIcon(data.status)}
                      <span className="ml-1 capitalize">{data.status}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {data.status === 'success' 
                      ? routingUtils.formatDistance(data.totalDistance)
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {data.status === 'success' 
                      ? routingUtils.formatDistance(data.averageDistance)
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {data.status === 'success' 
                      ? routingUtils.formatDuration(data.executionTime / 1000)
                      : 'N/A'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {data.status === 'success' && summary?.summary?.[method] ? (
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${Math.min(100, summary.summary[method].performance)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(summary.summary[method].performance)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RoutingComparison;