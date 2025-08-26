import React from 'react'
import { Link } from 'react-router-dom'
import { 
  Zap, 
  Cpu, 
  MapPin, 
  TrendingUp, 
  ArrowRight, 
  Play,
  BarChart3,
  Settings
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { useApp } from '../context/AppContext'

const Home = () => {
  const { state } = useApp()
  const { currentProblem, jobHistory } = state

  const features = [
    {
      icon: Zap,
      title: 'Quantum Algorithms',
      description: 'QAOA-based optimization using quantum simulators',
      color: 'text-quantum-600'
    },
    {
      icon: Cpu,
      title: 'Classical Solvers',
      description: 'Genetic Algorithm, Simulated Annealing, and more',
      color: 'text-blue-600'
    },
    {
      icon: MapPin,
      title: 'Interactive Maps',
      description: 'Visual route planning with Leaflet integration',
      color: 'text-green-600'
    },
    {
      icon: BarChart3,
      title: 'Performance Analysis',
      description: 'Compare quantum vs classical approaches',
      color: 'text-yellow-600'
    }
  ]

  const quickActions = [
    {
      title: 'Quick Start',
      description: 'Use sample data and default settings',
      link: '/setup?quick=true',
      icon: Play,
      variant: 'quantum'
    },
    {
      title: 'Custom Problem',
      description: 'Configure your own VRP instance',
      link: '/setup',
      icon: Settings,
      variant: 'primary'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gradient-to-r from-quantum-500 to-purple-600 rounded-2xl">
            <Zap className="h-12 w-12 text-white" />
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-bold mb-6">
          <span className="bg-gradient-to-r from-quantum-600 to-purple-600 bg-clip-text text-transparent">
            Quantum Fleet
          </span>
          <br />
          <span className="text-gray-900 dark:text-gray-100">
            VRP Solver
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto mb-8">
          Advanced Vehicle Routing Problem optimization combining quantum algorithms 
          with classical approaches for superior performance analysis.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.title} to={action.link}>
                <Button variant={action.variant} size="lg" className="w-full sm:w-auto">
                  <Icon className="h-5 w-5 mr-2" />
                  {action.title}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Features Grid */}
      <div className="mb-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
          Why Choose Quantum Fleet?
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="text-center p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-center mb-4">
                  <Icon className={`h-10 w-10 ${feature.color}`} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {feature.description}
                </p>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Status Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
        {/* Current Problem */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Current Problem</h3>
              <Link to="/setup">
                <Button variant="outline" size="sm">
                  Configure
                </Button>
              </Link>
            </div>
          </Card.Header>
          
          <Card.Content>
            {currentProblem.locations.length > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Locations:</span>
                  <Badge variant="primary">
                    {currentProblem.locations.length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Vehicles:</span>
                  <Badge variant="primary">
                    {currentProblem.num_vehicles}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <Badge variant="success">Ready to solve</Badge>
                </div>
                
                <Link to="/setup" className="block mt-4">
                  <Button variant="primary" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    Start Optimization
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  No problem configured yet
                </p>
                <Link to="/setup">
                  <Button variant="primary">
                    <Settings className="h-4 w-4 mr-2" />
                    Setup Problem
                  </Button>
                </Link>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Recent Results */}
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Recent Results</h3>
              <Link to="/history">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </Card.Header>
          
          <Card.Content>
            {jobHistory.length > 0 ? (
              <div className="space-y-3">
                {jobHistory.slice(0, 3).map((job, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{job.algorithm}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(job.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{job.cost?.toFixed(2)}</p>
                      <Badge size="sm" variant={job.type === 'quantum' ? 'quantum' : 'primary'}>
                        {job.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  No results yet
                </p>
              </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Getting Started */}
      <Card variant="quantum" className="text-center">
        <Card.Content className="p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Experience the power of quantum-enhanced optimization. Set up your vehicle routing problem 
            and compare quantum algorithms against classical approaches.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/setup">
              <Button variant="quantum" size="lg">
                <Zap className="h-5 w-5 mr-2" />
                Start Optimization
              </Button>
            </Link>
            <Link to="/history">
              <Button variant="outline" size="lg">
                <BarChart3 className="h-5 w-5 mr-2" />
                View Examples
              </Button>
            </Link>
          </div>
        </Card.Content>
      </Card>
    </div>
  )
}

export default Home