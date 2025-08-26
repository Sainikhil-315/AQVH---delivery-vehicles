import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  History as HistoryIcon, 
  Trash2, 
  Eye, 
  Download,
  Filter,
  Search,
  Calendar,
  TrendingUp
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import { useApp } from '../context/AppContext'
import { formatTimestamp, formatAlgorithmName, formatDistance, formatDuration } from '../utils/formatters'

const History = () => {
  const { state, dispatch } = useApp()
  const { jobHistory } = state
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState('timestamp')

  const filterOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'quantum', label: 'Quantum Only' },
    { value: 'classical', label: 'Classical Only' },
    { value: 'comparison', label: 'Comparisons' }
  ]

  const sortOptions = [
    { value: 'timestamp', label: 'Recent First' },
    { value: 'cost', label: 'Best Cost' },
    { value: 'algorithm', label: 'Algorithm' }
  ]

  const filteredAndSortedHistory = jobHistory
    .filter(job => {
      const matchesSearch = searchTerm === '' || 
        job.algorithms?.classical?.some(alg => alg.toLowerCase().includes(searchTerm.toLowerCase())) ||
        job.algorithms?.quantum?.some(alg => alg.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesType = filterType === 'all' || job.type === filterType
      
      return matchesSearch && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'cost':
          const aCost = getBestCost(a.results)
          const bCost = getBestCost(b.results)
          return aCost - bCost
        case 'algorithm':
          return (a.algorithms?.classical?.[0] || a.algorithms?.quantum?.[0] || '')
            .localeCompare(b.algorithms?.classical?.[0] || b.algorithms?.quantum?.[0] || '')
        default:
          return new Date(b.timestamp) - new Date(a.timestamp)
      }
    })

  const getBestCost = (results) => {
    if (!results) return Infinity
    
    // Handle different result structures
    let allCosts = []
    
    // If it's a comparison result with quantum/classical objects
    if (results.quantum || results.classical) {
      // Extract costs from quantum results (object with algorithm names as keys)
      if (results.quantum && typeof results.quantum === 'object') {
        Object.values(results.quantum).forEach(result => {
          if (result.total_cost !== undefined) {
            allCosts.push(result.total_cost)
          }
        })
      }
      
      // Extract costs from classical results (object with algorithm names as keys)
      if (results.classical && typeof results.classical === 'object') {
        Object.values(results.classical).forEach(result => {
          if (result.total_cost !== undefined) {
            allCosts.push(result.total_cost)
          }
        })
      }
      
      // Check if there's a comparison object with best_cost
      if (results.comparison?.best_cost !== undefined) {
        allCosts.push(results.comparison.best_cost)
      }
    } else {
      // Handle single result structure
      if (results.cost !== undefined) {
        allCosts.push(results.cost)
      } else if (results.total_cost !== undefined) {
        allCosts.push(results.total_cost)
      }
    }
    
    return allCosts.length > 0 ? Math.min(...allCosts) : Infinity
  }

  const loadResult = (job) => {
    dispatch({ type: 'SET_PROBLEM', payload: job.problem })
    dispatch({ type: 'SET_RESULTS', payload: job.results })
  }

  const deleteJob = (jobId) => {
    const updatedHistory = jobHistory.filter(job => job.id !== jobId)
    dispatch({ type: 'SET_JOB_HISTORY', payload: updatedHistory })
  }

  const exportJob = (job) => {
    const dataStr = JSON.stringify(job, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `vrp-job-${job.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      dispatch({ type: 'CLEAR_HISTORY' })
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <HistoryIcon className="h-8 w-8 mr-3 text-primary-600" />
            Job History
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage your optimization history
          </p>
        </div>

        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={clearHistory}
            disabled={jobHistory.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
          
          <Link to="/setup">
            <Button variant="primary">
              New Optimization
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <Card.Content className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search algorithms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="col-span-2"
            />
            
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              options={filterOptions}
            />
            
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={sortOptions}
            />
          </div>
        </Card.Content>
      </Card>

      {/* History List */}
      {filteredAndSortedHistory.length === 0 ? (
        <Card>
          <Card.Content className="p-12 text-center">
            <HistoryIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
              {jobHistory.length === 0 ? 'No History Yet' : 'No Results Found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {jobHistory.length === 0 
                ? 'Start optimizing problems to build your history'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            <Link to="/setup">
              <Button variant="primary">
                Start First Optimization
              </Button>
            </Link>
          </Card.Content>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedHistory.map((job) => {
            const bestCost = getBestCost(job.results)
            const algorithmCount = (job.algorithms?.classical?.length || 0) + (job.algorithms?.quantum?.length || 0)
            
            return (
              <Card key={job.id} className="hover:shadow-lg transition-shadow">
                <Card.Content className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-3">
                        <Badge variant={
                          job.type === 'quantum' ? 'quantum' : 
                          job.type === 'classical' ? 'primary' : 'default'
                        }>
                          {job.type}
                        </Badge>
                        
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatTimestamp(job.timestamp)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Problem Size</span>
                          <p className="font-medium">
                            {job.problem.locations?.length || 0} locations, {job.problem.num_vehicles || 0} vehicles
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Algorithms</span>
                          <p className="font-medium">{algorithmCount} tested</p>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <TrendingUp className="h-4 w-4 mr-1" />
                            Best Cost
                          </span>
                          <p className="font-medium">
                            {bestCost === Infinity ? 'N/A' : formatDistance(bestCost)}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-500 dark:text-gray-400">Status</span>
                          <Badge size="sm" variant="success">
                            Completed
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {job.algorithms?.quantum?.map((alg, index) => (
                          <Badge key={`q-${index}`} variant="quantum" size="sm">
                            {formatAlgorithmName(alg)}
                          </Badge>
                        ))}
                        {job.algorithms?.classical?.map((alg, index) => (
                          <Badge key={`c-${index}`} variant="primary" size="sm">
                            {formatAlgorithmName(alg)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Link to="/results">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadResult(job)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportJob(job)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteJob(job.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      <Card className="mt-8">
        <Card.Header>
          <h3 className="text-lg font-medium">Summary Statistics</h3>
        </Card.Header>
        
        <Card.Content>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {jobHistory.length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-quantum-600">
                {jobHistory.filter(j => j.algorithms?.quantum?.length > 0).length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Quantum Runs</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {jobHistory.filter(j => j.algorithms?.classical?.length > 0).length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Classical Runs</p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {jobHistory.filter(j => j.type === 'comparison').length}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comparisons</p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

export default History