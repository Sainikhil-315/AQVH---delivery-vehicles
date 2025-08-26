import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Github, Cpu, Zap, Brain } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  const [backendHealthy, setBackendHealthy] = useState(false);
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch("http://localhost:8000/health");
        const data = await res.json();
        setBackendHealthy(data.success === true);
      } catch (err) {
        setBackendHealthy(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    return () => clearInterval(interval);
  }, []);
  return (
    <footer className="border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mx-6">
      <div className="container-fluid py-8">
        <div className="grid grid-cols-1 place-items-center md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-gradient">
                Quantum Fleet
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
              Advanced Vehicle Routing Problem solver combining classical
              optimization with quantum computing algorithms for superior
              performance.
            </p>
          </div>

          {/* Technology Stack */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Technology
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4" />
                <span>QAOA Algorithm</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Qiskit Framework</span>
              </div>
              <div>React + FastAPI</div>
              <div>Classical Optimizers</div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Features
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div>Quantum Computing</div>
              <div>Classical Algorithms</div>
              <div>Performance Comparison</div>
              <div>Interactive Visualization</div>
              <div>Real-time Optimization</div>
            </div>
          </div>

          {/* Project Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Project
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div>Quantum Hackathon 2025</div>
              <div>Vehicle Routing Problem</div>
              <div>Open Source</div>
              <Link
                to={"https://github.com/Sainikhil-315/AQVH---delivery-vehicles"}
                target="_blank"
                className="flex items-center space-x-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>View on GitHub</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            {/* Copyright */}
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span>© 2025 Quantum Fleet VRP Solver</span>
              <span>•</span>
              <span>Developed by - </span>

              <span>The Matrix Minds</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Brain className="w-4 h-4 text-red-500" />
              </motion.div>
            </div>

            {/* Performance Stats */}
            {/* Performance Stats */}
            <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    backendHealthy ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                <span>
                  {backendHealthy ? "Backend Online" : "Backend Offline"}
                </span>
              </div>
              <div className="hidden sm:block">Quantum Ready</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
