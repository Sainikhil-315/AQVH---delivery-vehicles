# Quantum Fleet VRP Backend - Setup and Testing Guide

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Create and activate virtual environment
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

```bash
# Copy environment file
cp .env.example .env

# Edit .env file with your settings (optional)
# The defaults work fine for testing
```

### 3. Run the Backend

```bash
# Start the FastAPI server
python app.py

# Or use uvicorn directly
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at: `http://localhost:8000`

## 🧪 Testing the Backend

### API Documentation
Once running, visit `http://localhost:8000/docs` for interactive API documentation.

### 1. Health Check
```bash
curl http://localhost:8000/health
```

### 2. List Available Test Cases
```bash
curl http://localhost:8000/test-cases
```

### 3. Test Classical Algorithm
```bash
curl -X POST "http://localhost:8000/solve/classical" \
  -H "Content-Type: application/json" \
  -d '{
    "problem": {
      "locations": [[0,0], [2,3], [5,1], [3,4]],
      "num_vehicles": 2,
      "depot_index": 0
    },
    "algorithm": "nearest_neighbor",
    "max_iterations": 100
  }'
```

### 4. Test Quantum Algorithm
```bash
curl -X POST "http://localhost:8000/solve/quantum" \
  -H "Content-Type: application/json" \
  -d '{
    "problem": {
      "locations": [[0,0], [2,3], [5,1], [3,4]],
      "num_vehicles": 2,
      "depot_index": 0
    },
    "algorithm": "SPSA",
    "max_iterations": 50,
    "additional_params": {
      "p_layers": 2,
      "shots": 1024
    }
  }'
```

### 5. Compare All Algorithms
```bash
curl -X POST "http://localhost:8000/compare/all" \
  -H "Content-Type: application/json" \
  -d '{
    "problem": {
      "locations": [[0,0], [2,3], [5,1], [3,4]],
      "num_vehicles": 2,
      "depot_index": 0
    },
    "quantum_optimizers": ["SPSA", "COBYLA"],
    "classical_algorithms": ["nearest_neighbor", "genetic_algorithm"],
    "max_iterations": 30
  }'
```

## 🔬 Testing Individual Components

### Test Sample Data
```bash
cd backend
python sample_data.py
```

### Test Classical Solvers
```bash
cd backend
python classical_solver.py
```

### Test Quantum Optimizers
```bash
cd backend
python optimizers.py
```

### Test Quantum VRP Solver
```bash
cd backend
python vrp_solver.py
```

## 🎯 Algorithm Performance

### Classical Algorithms Available:
- **nearest_neighbor**: Fast, greedy heuristic
- **genetic_algorithm**: Population-based metaheuristic
- **simulated_annealing**: Probabilistic optimization
- **branch_and_bound**: Exact solver (small instances only)

### Quantum Optimizers Available:
- **SPSA**: Simultaneous Perturbation Stochastic Approximation
- **ADAM**: Adaptive Moment Estimation
- **COBYLA**: Constrained Optimization BY Linear Approximation  
- **Powell**: Powell's method
- **L-BFGS-B**: Limited-memory BFGS with bounds
- **Ensemble**: Runs multiple optimizers
- **Adaptive**: Automatically selects best optimizer

## 🔧 Configuration Options

### Quantum Settings
- `p_layers`: QAOA depth (1-5, default: 2)
- `shots`: Quantum measurements (512-8192, default: 1024)
- `maxiter`: Optimizer iterations (10-500, default: 100)

### Classical Settings
- `generations`: GA generations (10-500, default: 100)
- `population_size`: GA population (20-200, default: 50)
- `max_iterations`: SA iterations (50-2000, default: 1000)

## 🚨 Important Notes

### Quantum Simulation Limits
- **Maximum qubits**: 20 (hardware limitation)
- **Maximum locations**: ~6 for practical performance
- **Recommended vehicles**: 1-3

### Problem Size Guidelines
| Locations | Vehicles | Qubits Needed | Status |
|-----------|----------|---------------|---------|
| 4         | 2        | 12            | ✅ Fast |
| 5         | 2        | 20            | ✅ OK   |
| 6         | 2        | 30            | ❌ Too Large |

### IBM Quantum Integration
This implementation uses **simulators only** by default. To use real IBM Quantum hardware:

1. Get IBM Quantum API token from https://quantum-computing.ibm.com/
2. Add to `.env`:
   ```bash
   IBMQ_API_TOKEN=your_token_here
   ```
3. Modify `vrp_solver.py` to use real backend instead of simulator

### Performance Expectations
- **Quantum (simulated)**: 10-60 seconds per optimization
- **Classical**: 0.1-10 seconds depending on algorithm
- **Comparison**: 30-120 seconds for full analysis

## 🐛 Troubleshooting

### Common Issues

1. **"No module named 'qiskit'"**
   ```bash
   pip install qiskit==0.45.0 qiskit-aer==0.13.0
   ```

2. **"Problem too large: X qubits needed"**
   - Use fewer locations (≤5)
   - Try classical algorithms instead

3. **Quantum optimization fails**
   - Check if problem is valid
   - Try different optimizer (COBYLA is most robust)
   - Reduce max_iterations

4. **Slow performance**
   - Reduce quantum shots (<1024)
   - Use fewer QAOA layers (p_layers=1)
   - Try faster classical algorithms first

### Debug Mode
```bash
# Enable verbose logging
export LOG_LEVEL=DEBUG
python app.py
```

## 📊 Expected Results

For the small test case (4 locations, 2 vehicles):

### Classical Results
- **Nearest Neighbor**: ~7.2 cost, 0.01s
- **Genetic Algorithm**: ~6.8 cost, 2.5s  
- **Simulated Annealing**: ~6.9 cost, 1.2s

### Quantum Results (QAOA)
- **SPSA**: ~6.5-7.5 cost, 15-30s
- **COBYLA**: ~6.8-7.8 cost, 10-25s
- **ADAM**: ~7.0-8.0 cost, 20-40s

*Note: Quantum results vary due to probabilistic nature*

## 🎯 Success Criteria

✅ **Backend is working if**:
- Health check returns `{"status": "healthy"}`
- Test cases load without errors
- Classical algorithms return valid solutions
- Quantum algorithms complete (even with fallback)
- Comparison endpoint returns results

## 🚀 Next Steps

Once backend is working:
1. Test all endpoints with different problems
2. Verify quantum vs classical comparison
3. Check solution validation
4. Ready for frontend integration!

## 🔗 Useful Endpoints for Testing

- `GET /` - API information
- `GET /health` - System status
- `GET /test-cases` - Available test problems
- `GET /algorithms` - Available algorithms
- `GET /stats` - Performance statistics
- `POST /solve/quantum` - QAOA solver
- `POST /solve/classical` - Classical solver
- `POST /compare/all` - Algorithm comparison