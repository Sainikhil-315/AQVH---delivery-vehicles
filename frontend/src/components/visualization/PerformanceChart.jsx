import React, { useEffect, useRef } from 'react'
import Chart from 'chart.js/auto'

const PerformanceChart = ({ data = [], type = 'bar', className = '' }) => {
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    if (!chartRef.current || !data.length) return

    // Destroy existing chart
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const ctx = chartRef.current.getContext('2d')
    
    const chartConfig = {
      type,
      data: {
        labels: data.map(item => item.algorithm || item.label),
        datasets: [{
          label: type === 'bar' ? 'Total Cost' : 'Execution Time (s)',
          data: data.map(item => item.cost || item.executionTime || item.value),
          backgroundColor: data.map((_, index) => {
            const colors = [
              'rgba(59, 130, 246, 0.7)',  // blue
              'rgba(217, 70, 239, 0.7)',  // quantum purple
              'rgba(16, 185, 129, 0.7)',  // green
              'rgba(245, 158, 11, 0.7)',  // yellow
              'rgba(239, 68, 68, 0.7)',   // red
              'rgba(139, 92, 246, 0.7)',  // purple
            ]
            return colors[index % colors.length]
          }),
          borderColor: data.map((_, index) => {
            const colors = [
              'rgba(59, 130, 246, 1)',
              'rgba(217, 70, 239, 1)',
              'rgba(16, 185, 129, 1)',
              'rgba(245, 158, 11, 1)',
              'rgba(239, 68, 68, 1)',
              'rgba(139, 92, 246, 1)',
            ]
            return colors[index % colors.length]
          }),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const item = data[context.dataIndex]
                return [
                  `Cost: ${item.cost?.toFixed(2) || 'N/A'}`,
                  `Time: ${item.executionTime?.toFixed(2) || 'N/A'}s`,
                  `Type: ${item.type || 'Unknown'}`
                ]
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            },
            ticks: {
              color: 'rgba(107, 114, 128, 0.8)',
              maxRotation: 45
            }
          },
          x: {
            grid: {
              color: 'rgba(156, 163, 175, 0.1)'
            },
            ticks: {
              color: 'rgba(107, 114, 128, 0.8)',
              maxRotation: 45
            }
          }
        }
      }
    }

    chartInstance.current = new Chart(ctx, chartConfig)

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data, type])

  if (!data.length) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <p className="text-gray-500 dark:text-gray-400">No data available</p>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <canvas ref={chartRef} className="w-full h-64" />
    </div>
  )
}

export default PerformanceChart