import React from 'react'
import { Zap, Github, Heart, Brain } from 'lucide-react'

const Footer = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="p-2 bg-gradient-to-r from-quantum-500 to-purple-600 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-quantum-600 to-purple-600 bg-clip-text text-transparent">
                Quantum Fleet
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Advanced Vehicle Routing Problem solver combining quantum and classical optimization algorithms.
            </p>
          </div>

          {/* Links */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Quantum Algorithms (QAOA)</li>
              <li>Classical Solvers</li>
              <li>Interactive Maps</li>
              <li>Performance Comparison</li>
            </ul>
          </div>

          {/* Credits */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Built With
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>React & Tailwind CSS</li>
              <li>Qiskit & FastAPI</li>
              <li>Leaflet.js & Chart.js</li>
              <li>Quantum Computing</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
            <span>Developed by - </span>
            <span>The Matrix Minds</span>
            <Brain className="h-4 w-4 text-red-500" />
          </div>
          
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            <a
              href="https://github.com/Sainikhil-315/AQVH---delivery-vehicles"
              target="_blank"
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer