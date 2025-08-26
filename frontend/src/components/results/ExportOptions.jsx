import React from 'react'
import { Download, FileText, Image, Share2 } from 'lucide-react'
import Button from '../ui/Button'
import Card from '../ui/Card'

const ExportOptions = ({ results, onExport }) => {
  const exportFormats = [
    {
      id: 'json',
      label: 'JSON Data',
      description: 'Raw results data',
      icon: FileText,
      format: 'json'
    },
    {
      id: 'csv',
      label: 'CSV Report',
      description: 'Spreadsheet format',
      icon: FileText,
      format: 'csv'
    },
    {
      id: 'image',
      label: 'Route Image',
      description: 'Map visualization',
      icon: Image,
      format: 'png'
    }
  ]

  const handleExport = (format) => {
    if (onExport) {
      onExport(results, format)
    } else {
      // Default export logic
      const dataStr = JSON.stringify(results, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vrp-results-${Date.now()}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const shareResults = () => {
    if (navigator.share) {
      navigator.share({
        title: 'VRP Optimization Results',
        text: `Optimization completed with cost: ${results.cost?.toFixed(2)}`,
        url: window.location.href
      })
    } else {
      // Fallback to clipboard
      const resultSummary = `VRP Results:
Algorithm: ${results.algorithm}
Total Cost: ${results.cost?.toFixed(2)}
Execution Time: ${results.executionTime?.toFixed(2)}s
Routes: ${results.routes?.length || 0}`
      
      navigator.clipboard.writeText(resultSummary).then(() => {
        alert('Results copied to clipboard!')
      })
    }
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-medium">Export & Share</h3>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={shareResults}
            disabled={!results}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </Card.Header>

      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {exportFormats.map((format) => {
            const Icon = format.icon
            
            return (
              <div
                key={format.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <Icon className="h-6 w-6 text-primary-600" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {format.label}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format.description}
                    </p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleExport(format.format)}
                  disabled={!results}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export {format.format.toUpperCase()}
                </Button>
              </div>
            )
          })}
        </div>

        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Export Information
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• JSON format includes complete algorithm results and metadata</li>
            <li>• CSV format is suitable for spreadsheet analysis</li>
            <li>• Image export captures the current map visualization</li>
            <li>• All exports include timestamp and algorithm information</li>
          </ul>
        </div>
      </Card.Content>
    </Card>
  )
}

export default ExportOptions