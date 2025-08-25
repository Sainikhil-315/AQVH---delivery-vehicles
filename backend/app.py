"""
FastAPI backend for Quantum Fleet Hackathon.
Provides endpoints for quantum and classical VRP solving with comprehensive metrics.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import time
import traceback
from contextlib import asynccontextmanager
from functools import lru_cache
import importlib
from starlette.concurrency import run_in_threadpool

# Local imports
def _sd():
    """Lazy loader for sample_data module to reduce startup work."""
    return importlib.import_module('sample_data')
# Note: Heavy modules (Qiskit and related) are imported lazily inside endpoints
# to reduce startup time and memory footprint.

# Pydantic models for API requests/responses
class Location(BaseModel):
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")

class VRPProblem(BaseModel):
    locations: List[Tuple[float, float]] = Field(..., description="List of (lat, lon) coordinates")
    num_vehicles: int = Field(..., ge=1, le=5, description="Number of vehicles (1-5)") #le = no of vehicles 
    depot_index: int = Field(0, ge=0, description="Index of depot location")

class SolverRequest(BaseModel):
    problem: VRPProblem
    algorithm: str = Field("SPSA", description="Algorithm name")
    max_iterations: int = Field(100, ge=10, le=500, description="Maximum iterations") # le = no of iterations
    additional_params: Dict[str, Any] = Field(default_factory=dict)

class ComparisonRequest(BaseModel):
    problem: VRPProblem
    quantum_optimizers: List[str] = Field(default=["SPSA", "COBYLA"], description="Quantum optimizers to test")
    classical_algorithms: List[str] = Field(default=["nearest_neighbor", "genetic_algorithm"], description="Classical algorithms to test")
    max_iterations: int = Field(50, ge=10, le=200, description="Maximum iterations per algorithm")

# Global variables for caching
app_state = {
    "test_cases": {},
    "algorithm_performance": {},
    "startup_time": None
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app_state["startup_time"] = time.time()
    # Lazy import sample data and load test cases
    app_state["test_cases"] = _sd().get_all_test_cases()
    print(f"Loaded {len(app_state['test_cases'])} test cases")
    
    # Print quantum feasibility info
    feasible_cases = _sd().get_feasible_test_cases()
    print(f"Quantum feasible test cases: {len(feasible_cases)}")
    
    yield
    
    # Shutdown
    print("Shutting down VRP solver backend")

# Create FastAPI app (prefer fast JSON if available)
default_kwargs = {
    "title": "Quantum Fleet VRP Solver",
    "description": "Advanced VRP solver using QAOA quantum computing with classical algorithm comparison",
    "version": "1.0.0",
    "lifespan": lifespan
}
try:
    from fastapi.responses import ORJSONResponse  # type: ignore
    app = FastAPI(default_response_class=ORJSONResponse, **default_kwargs)
except Exception:
    app = FastAPI(**default_kwargs)

# Add CORS and GZip middleware (compression improves payload transfer time)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

# Utility functions
def _locations_to_key(locations: List[Tuple[float, float]]) -> Tuple[Tuple[float, float], ...]:
    """Convert list of (lat, lon) to a hashable tuple key with stable float types."""
    return tuple((float(lat), float(lon)) for lat, lon in locations)


@lru_cache(maxsize=256)
def _distance_matrix_cached(locations_key: Tuple[Tuple[float, float], ...]) -> np.ndarray:
    """Vectorized and cached Euclidean distance matrix computation."""
    if not locations_key:
        return np.zeros((0, 0))
    coords = np.asarray(locations_key, dtype=np.float64)
    diffs = coords[:, None, :] - coords[None, :, :]
    matrix = np.sqrt((diffs * diffs).sum(axis=2))
    # Ensure exact zeros on diagonal (avoid tiny numerical noise)
    np.fill_diagonal(matrix, 0.0)
    return matrix


def create_distance_matrix(locations: List[Tuple[float, float]]) -> np.ndarray:
    """Create distance matrix from location coordinates with caching and vectorization."""
    return _distance_matrix_cached(_locations_to_key(locations))

def format_response(result: Dict[str, Any], success: bool = True) -> Dict[str, Any]:
    """Standardize API response format"""
    return {
        "success": success,
        "timestamp": time.time(),
        "data": result if success else None,
        "error": None if success else result.get("error", "Unknown error")
    }

# API Endpoints

@app.get("/")
async def root():
    """Root endpoint with API information"""
    uptime = time.time() - app_state["startup_time"] if app_state["startup_time"] else 0
    
    return format_response({
        "message": "Quantum Fleet VRP Solver API",
        "version": "1.0.0",
        "uptime_seconds": uptime,
        "endpoints": {
            "test_cases": "/test-cases",
            "quantum_solve": "/solve/quantum",
            "classical_solve": "/solve/classical",
            "compare": "/compare/all",
            "algorithms": "/algorithms",
            "health": "/health"
        }
    })

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test basic functionality
        test_case = _sd().get_test_case("small_4_2")
        qubits_needed = _sd().estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
        
        return format_response({
            "status": "healthy",
            "quantum_simulator": "available",
            "test_cases_loaded": len(app_state["test_cases"]),
            "sample_problem_qubits": qubits_needed,
            "quantum_feasible": _sd().is_quantum_feasible(test_case.num_locations)
        })
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/test-cases")
async def get_test_cases_endpoint(include_matrix: bool = Query(default=False, description="Include full distance matrices in response")):
    """Get all available test cases"""
    try:
        test_cases_info = {}
        
        for name, test_case in app_state["test_cases"].items():
            qubits_needed = _sd().estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
            
            base_info = {
                "name": test_case.name,
                "locations": test_case.locations,
                "num_vehicles": test_case.num_vehicles,
                "num_locations": test_case.num_locations,
                "depot_index": test_case.depot_index,
                "qubits_needed": qubits_needed,
                "quantum_feasible": _sd().is_quantum_feasible(test_case.num_locations)
            }
            if include_matrix:
                base_info["distance_matrix"] = test_case.distance_matrix.tolist()
            test_cases_info[name] = base_info
        
        return format_response({
            "test_cases": test_cases_info,
            "total_cases": len(test_cases_info),
            "quantum_feasible_cases": len([tc for tc in test_cases_info.values() if tc["quantum_feasible"]])
        })
    
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/test-cases/{case_name}")
async def get_specific_test_case(case_name: str, include_matrix: bool = Query(default=False, description="Include full distance matrix in response")):
    """Get a specific test case by name"""
    try:
        if case_name not in app_state["test_cases"]:
            raise HTTPException(status_code=404, detail=f"Test case '{case_name}' not found")
        
        test_case = app_state["test_cases"][case_name]
        qubits_needed = _sd().estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
        
        data = {
            "name": test_case.name,
            "locations": test_case.locations,
            "num_vehicles": test_case.num_vehicles,
            "num_locations": test_case.num_locations,
            "depot_index": test_case.depot_index,
            "qubits_needed": qubits_needed,
            "quantum_feasible": _sd().is_quantum_feasible(test_case.num_locations)
        }
        if include_matrix:
            data["distance_matrix"] = test_case.distance_matrix.tolist()
        return format_response(data)
    
    except HTTPException:
        raise
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/algorithms")
async def get_available_algorithms():
    """Get all available algorithms and optimizers"""
    try:
        # Lazy imports to avoid heavy modules at startup
        classical_mod = importlib.import_module('classical_solver')
        optimizers_mod = importlib.import_module('optimizers')
        return format_response({
            "quantum_optimizers": optimizers_mod.get_available_optimizers(),
            "classical_algorithms": classical_mod.get_available_classical_algorithms(),
            "quantum_info": {
                "max_qubits_simulation": 20,
                "recommended_p_layers": [1, 2, 3],
                "default_shots": 1024
            },
            "classical_info": {
                "fastest": "nearest_neighbor",
                "most_accurate": "branch_and_bound",
                "balanced": "genetic_algorithm"
            }
        })
    
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.post("/solve/quantum")
async def solve_quantum_endpoint(request: SolverRequest):
    """Solve VRP using quantum QAOA algorithm"""
    try:
        # Create distance matrix
        distance_matrix = create_distance_matrix(request.problem.locations)
        
        # Check quantum feasibility
        num_locations = len(request.problem.locations)
        qubits_needed = estimate_qubits_needed(num_locations, request.problem.num_vehicles)
        
        if qubits_needed > 20:
            raise HTTPException(
                status_code=400,
                detail=f"Problem too large for quantum simulation: {qubits_needed} qubits needed (max 20)"
            )
        
        # Extract parameters
        optimizer = request.algorithm
        max_iterations = request.max_iterations
        p_layers = request.additional_params.get("p_layers", 2)
        shots = request.additional_params.get("shots", 1024)
        
        # Validate optimizer (lazy import)
        optimizers_mod = importlib.import_module('optimizers')
        if optimizer not in optimizers_mod.get_available_optimizers():
            raise HTTPException(
                status_code=400,
                detail=f"Unknown quantum optimizer: {optimizer}. Available: {optimizers_mod.get_available_optimizers()}"
            )
        
        # Solve in threadpool to avoid blocking event loop
        vrp_mod = importlib.import_module('vrp_solver')
        result = await run_in_threadpool(
            vrp_mod.solve_vrp_quantum,
            distance_matrix,
            request.problem.num_vehicles,
            optimizer,
            p_layers,
            request.problem.depot_index,
            max_iterations,
            shots
        )
        
        # Add problem info to result
        result["problem_info"] = {
            "locations": request.problem.locations,
            "num_vehicles": request.problem.num_vehicles,
            "num_locations": num_locations,
            "qubits_needed": qubits_needed
        }
        
        return format_response(result)
    
    except HTTPException:
        raise
    except Exception as e:
        error_detail = {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "algorithm": request.algorithm
        }
        return format_response(error_detail, success=False)

@app.post("/solve/classical")
async def solve_classical_endpoint(request: SolverRequest):
    """Solve VRP using classical algorithms"""
    try:
        # Create distance matrix
        distance_matrix = create_distance_matrix(request.problem.locations)
        
        # Extract parameters
        algorithm = request.algorithm
        max_iterations = request.max_iterations
        
        # Validate algorithm
        classical_mod = importlib.import_module('classical_solver')
        if algorithm not in classical_mod.get_available_classical_algorithms():
            raise HTTPException(
                status_code=400,
                detail=f"Unknown classical algorithm: {algorithm}. Available: {classical_mod.get_available_classical_algorithms()}"
            )
        
        # Prepare algorithm-specific parameters
        algo_params = {}
        if algorithm == "genetic_algorithm":
            algo_params.update({
                "generations": max_iterations,
                "population_size": request.additional_params.get("population_size", 50),
                "mutation_rate": request.additional_params.get("mutation_rate", 0.1)
            })
        elif algorithm == "simulated_annealing":
            algo_params.update({
                "max_iterations": max_iterations,
                "initial_temp": request.additional_params.get("initial_temp", 1000.0),
                "cooling_rate": request.additional_params.get("cooling_rate", 0.95)
            })
        elif algorithm == "branch_and_bound":
            algo_params.update({
                "max_time": request.additional_params.get("max_time", 30.0)
            })
        
        # Solve in threadpool to avoid blocking event loop
        result = await run_in_threadpool(
            classical_mod.solve_vrp_classical,
            distance_matrix,
            request.problem.num_vehicles,
            algorithm,
            request.problem.depot_index,
            **algo_params
        )
        
        # Add problem info to result
        result["problem_info"] = {
            "locations": request.problem.locations,
            "num_vehicles": request.problem.num_vehicles,
            "num_locations": len(request.problem.locations)
        }
        
        return format_response(result)
    
    except HTTPException:
        raise
    except Exception as e:
        error_detail = {
            "error": str(e),
            "traceback": traceback.format_exc(),
            "algorithm": request.algorithm
        }
        return format_response(error_detail, success=False)

@app.post("/compare/all")
async def compare_all_algorithms(request: ComparisonRequest):
    """Compare quantum and classical algorithms on the same problem"""
    try:
        # Create distance matrix
        distance_matrix = create_distance_matrix(request.problem.locations)
        
        # Check quantum feasibility
        num_locations = len(request.problem.locations)
        qubits_needed = estimate_qubits_needed(num_locations, request.problem.num_vehicles)
        
        quantum_feasible = qubits_needed <= 20
        
        # Filter quantum optimizers if problem is too large
        quantum_optimizers = request.quantum_optimizers if quantum_feasible else []
        
        if not quantum_feasible:
            print(f"Warning: Problem requires {qubits_needed} qubits, skipping quantum algorithms")
        
        # Run comparison
        vrp_mod = importlib.import_module('vrp_solver')
        result = await run_in_threadpool(
            vrp_mod.compare_quantum_classical,
            distance_matrix,
            request.problem.num_vehicles,
            quantum_optimizers,
            request.classical_algorithms,
            request.problem.depot_index
        )
        
        # Add metadata
        result["metadata"] = {
            "problem_info": {
                "locations": request.problem.locations,
                "num_vehicles": request.problem.num_vehicles,
                "num_locations": num_locations,
                "qubits_needed": qubits_needed,
                "quantum_feasible": quantum_feasible
            },
            "algorithms_tested": {
                "quantum": quantum_optimizers,
                "classical": request.classical_algorithms,
                "total": len(quantum_optimizers) + len(request.classical_algorithms)
            },
            "max_iterations": request.max_iterations
        }
        
        return format_response(result)
    
    except Exception as e:
        error_detail = {
            "error": str(e),
            "traceback": traceback.format_exc()
        }
        return format_response(error_detail, success=False)

@app.post("/compare/quantum-optimizers")
async def compare_quantum_optimizers(
    problem: VRPProblem,
    optimizers: List[str] = Query(default=["SPSA", "COBYLA", "ADAM"]),
    max_iterations: int = Query(default=50, ge=10, le=200),
    p_layers: int = Query(default=2, ge=1, le=5)
):
    """Compare different quantum optimizers on the same problem"""
    try:
        # Create distance matrix
        distance_matrix = create_distance_matrix(problem.locations)
        
        # Check quantum feasibility
        num_locations = len(problem.locations)
        qubits_needed = estimate_qubits_needed(num_locations, problem.num_vehicles)
        
        if qubits_needed > 20:
            raise HTTPException(
                status_code=400,
                detail=f"Problem too large: {qubits_needed} qubits needed (max 20)"
            )
        
        # Validate optimizers
        optimizers_mod = importlib.import_module('optimizers')
        available = optimizers_mod.get_available_optimizers()
        invalid_optimizers = [opt for opt in optimizers if opt not in available]
        if invalid_optimizers:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid optimizers: {invalid_optimizers}. Available: {available}"
            )
        
        # Run comparison
        results = {}
        
        for optimizer in optimizers:
            print(f"Testing quantum optimizer: {optimizer}")
            try:
                vrp_mod = importlib.import_module('vrp_solver')
                result = await run_in_threadpool(
                    vrp_mod.solve_vrp_quantum,
                    distance_matrix,
                    problem.num_vehicles,
                    optimizer,
                    p_layers,
                    problem.depot_index,
                    max_iterations
                )
                results[optimizer] = result
                
            except Exception as e:
                print(f"Optimizer {optimizer} failed: {e}")
                results[optimizer] = {"error": str(e), "success": False}
        
        # Analyze results
        successful = {k: v for k, v in results.items() if "error" not in v}
        
        analysis = {
            "results": results,
            "summary": {
                "total_optimizers": len(optimizers),
                "successful_optimizers": len(successful),
                "best_optimizer": None,
                "best_cost": None
            }
        }
        
        if successful:
            best_optimizer = min(successful.keys(), key=lambda k: successful[k]["total_cost"])
            analysis["summary"]["best_optimizer"] = best_optimizer
            analysis["summary"]["best_cost"] = successful[best_optimizer]["total_cost"]
        
        return format_response(analysis)
    
    except HTTPException:
        raise
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.post("/validate-solution")
async def validate_solution_endpoint(
    locations: List[Tuple[float, float]],
    solution: List[List[int]],
    depot_index: int = 0
):
    """Validate a VRP solution"""
    try:
        # Create a test case object
        distance_matrix = create_distance_matrix(locations)
        
        test_case = type('TestCase', (), {
            'distance_matrix': distance_matrix,
            'num_locations': len(locations),
            'depot_index': depot_index,
            'locations': locations
        })()
        
        # Validate
        validation_result = validate_solution(test_case, solution)
        
        return format_response({
            "validation": validation_result,
            "problem_info": {
                "locations": locations,
                "num_locations": len(locations),
                "depot_index": depot_index
            }
        })
    
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.post("/generate-random-problem")
async def generate_random_problem(
    num_locations: int = Query(..., ge=4, le=8, description="Number of locations (4-8)"),
    num_vehicles: int = Query(..., ge=1, le=3, description="Number of vehicles (1-3)"),
    seed: int = Query(default=42, description="Random seed for reproducibility"),
    include_matrix: bool = Query(default=False, description="Include full distance matrix in response")
):
    """Generate a random VRP problem"""
    try:
        # Check quantum feasibility
        qubits_needed = estimate_qubits_needed(num_locations, num_vehicles)
        if qubits_needed > 20:
            raise HTTPException(
                status_code=400,
                detail=f"Problem would be too large: {qubits_needed} qubits needed (max 20)"
            )
        
        # Generate random test case
        test_case = create_random_test_case(num_locations, num_vehicles, seed)
        
        metadata = {
            "name": test_case.name,
            "qubits_needed": qubits_needed,
            "quantum_feasible": True
        }
        if include_matrix:
            metadata["distance_matrix"] = test_case.distance_matrix.tolist()
        return format_response({
            "problem": {
                "locations": test_case.locations,
                "num_vehicles": test_case.num_vehicles,
                "depot_index": test_case.depot_index
            },
            "metadata": metadata
        })
    
    except HTTPException:
        raise
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/stats")
async def get_system_stats():
    """Get system statistics and performance metrics"""
    try:
        uptime = time.time() - app_state["startup_time"] if app_state["startup_time"] else 0
        
        # Analyze test cases
        test_case_stats = {}
        for name, test_case in app_state["test_cases"].items():
            qubits = estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
            test_case_stats[name] = {
                "locations": test_case.num_locations,
                "vehicles": test_case.num_vehicles,
                "qubits": qubits,
                "feasible": is_quantum_feasible(test_case.num_locations)
            }
        
        stats = {
            "system": {
                "uptime_seconds": uptime,
                "uptime_formatted": f"{uptime/3600:.1f} hours" if uptime > 3600 else f"{uptime:.1f} seconds"
            },
            "test_cases": {
                "total": len(app_state["test_cases"]),
                "quantum_feasible": len([tc for tc in test_case_stats.values() if tc["feasible"]]),
                "details": test_case_stats
            },
            "algorithms": {
                "quantum_optimizers": len(get_available_optimizers()),
                "classical_algorithms": len(get_available_classical_algorithms())
            },
            "quantum_limits": {
                "max_simulation_qubits": 20,
                "max_recommended_locations": 6,
                "max_recommended_vehicles": 3
            }
        }
        
        return format_response(stats)
    
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

# Custom error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content=format_response({"error": exc.detail}, success=False)
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content=format_response({
            "error": "Internal server error",
            "detail": str(exc),
            "type": type(exc).__name__
        }, success=False)
    )

if __name__ == "__main__":
    import uvicorn # for running application
    
    print("Starting Quantum Fleet VRP Solver Backend")
    print("Available endpoints:")
    print("  GET  /                     - API info")
    print("  GET  /health               - Health check")
    print("  GET  /test-cases           - List test cases")
    print("  GET  /algorithms           - Available algorithms")
    print("  POST /solve/quantum        - Solve with QAOA")
    print("  POST /solve/classical      - Solve with classical")
    print("  POST /compare/all          - Compare all algorithms")
    print("  GET  /stats                - System statistics")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )