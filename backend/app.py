"""
FastAPI backend for Quantum Fleet Hackathon.
Provides endpoints for quantum and classical VRP solving with comprehensive metrics.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import time
import traceback
from contextlib import asynccontextmanager
from distance.road_calc import create_osrm_calculator

# Local imports
from sample_data import (
    get_test_case, get_all_test_cases, create_random_test_case,
    validate_solution, VRPTestCase, get_feasible_test_cases,
    estimate_qubits_needed, is_quantum_feasible
)
from vrp_solver import (
    solve_vrp_quantum, compare_quantum_classical, QAOAVRPSolver
)
from classical_solver import (
    solve_vrp_classical, compare_classical_algorithms,
    get_available_classical_algorithms
)
from optimizers import (
    get_available_optimizers, compare_optimizers, create_optimizer
)

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

# Request schemas
class RouteRequest(BaseModel):
    service: str = "osrm"
    profile: str = "driving"
    coordinates: List[Tuple[float, float]]  # [[lat, lon], [lat, lon]]

class MatrixRequest(BaseModel):
    service: str = "osrm"
    profile: str = "driving"
    locations: List[Tuple[float, float]]

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
    app_state["test_cases"] = get_all_test_cases()
    print(f"Loaded {len(app_state['test_cases'])} test cases")
    
    # Print quantum feasibility info
    feasible_cases = get_feasible_test_cases()
    print(f"Quantum feasible test cases: {len(feasible_cases)}")
    
    yield
    
    # Shutdown
    print("Shutting down VRP solver backend")

# Create FastAPI app
app = FastAPI(
    title="Quantum Fleet VRP Solver",
    description="Advanced VRP solver using QAOA quantum computing with classical algorithm comparison",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Utility functions
def create_distance_matrix(locations: List[Tuple[float, float]]) -> np.ndarray:
    """Create distance matrix from location coordinates"""
    n = len(locations)
    matrix = np.zeros((n, n))
    
    for i in range(n):
        for j in range(n):
            if i != j:
                lat1, lon1 = locations[i]
                lat2, lon2 = locations[j]
                # Euclidean distance (can be replaced with haversine for real coordinates)
                distance = np.sqrt((lat2 - lat1)**2 + (lon2 - lon1)**2)
                matrix[i][j] = distance
    
    return matrix

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
        test_case = get_test_case("small_4_2")
        qubits_needed = estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
        
        return format_response({
            "status": "healthy",
            "quantum_simulator": "available",
            "test_cases_loaded": len(app_state["test_cases"]),
            "sample_problem_qubits": qubits_needed,
            "quantum_feasible": is_quantum_feasible(test_case.num_locations)
        })
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/test-cases")
async def get_test_cases_endpoint():
    """Get all available test cases"""
    try:
        test_cases_info = {}
        
        for name, test_case in app_state["test_cases"].items():
            qubits_needed = estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
            
            test_cases_info[name] = {
                "name": test_case.name,
                "locations": test_case.locations,
                "num_vehicles": test_case.num_vehicles,
                "num_locations": test_case.num_locations,
                "depot_index": test_case.depot_index,
                "qubits_needed": qubits_needed,
                "quantum_feasible": is_quantum_feasible(test_case.num_locations),
                "distance_matrix": test_case.distance_matrix.tolist()
            }
        
        return format_response({
            "test_cases": test_cases_info,
            "total_cases": len(test_cases_info),
            "quantum_feasible_cases": len([tc for tc in test_cases_info.values() if tc["quantum_feasible"]])
        })
    
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/test-cases/{case_name}")
async def get_specific_test_case(case_name: str):
    """Get a specific test case by name"""
    try:
        if case_name not in app_state["test_cases"]:
            raise HTTPException(status_code=404, detail=f"Test case '{case_name}' not found")
        
        test_case = app_state["test_cases"][case_name]
        qubits_needed = estimate_qubits_needed(test_case.num_locations, test_case.num_vehicles)
        
        return format_response({
            "name": test_case.name,
            "locations": test_case.locations,
            "num_vehicles": test_case.num_vehicles,
            "num_locations": test_case.num_locations,
            "depot_index": test_case.depot_index,
            "distance_matrix": test_case.distance_matrix.tolist(),
            "qubits_needed": qubits_needed,
            "quantum_feasible": is_quantum_feasible(test_case.num_locations)
        })
    
    except HTTPException:
        raise
    except Exception as e:
        return format_response({"error": str(e)}, success=False)

@app.get("/algorithms")
async def get_available_algorithms():
    """Get all available algorithms and optimizers"""
    try:
        return format_response({
            "quantum_optimizers": get_available_optimizers(),
            "classical_algorithms": get_available_classical_algorithms(),
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
        
        # Validate optimizer
        if optimizer not in get_available_optimizers():
            raise HTTPException(
                status_code=400,
                detail=f"Unknown quantum optimizer: {optimizer}. Available: {get_available_optimizers()}"
            )
        
        # Solve
        result = solve_vrp_quantum(
            distance_matrix=distance_matrix,
            num_vehicles=request.problem.num_vehicles,
            optimizer=optimizer,
            p_layers=p_layers,
            depot_index=request.problem.depot_index,
            maxiter=max_iterations,
            shots=shots
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
        if algorithm not in get_available_classical_algorithms():
            raise HTTPException(
                status_code=400,
                detail=f"Unknown classical algorithm: {algorithm}. Available: {get_available_classical_algorithms()}"
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
        
        # Solve
        result = solve_vrp_classical(
            distance_matrix=distance_matrix,
            num_vehicles=request.problem.num_vehicles,
            algorithm=algorithm,
            depot_index=request.problem.depot_index,
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
        result = compare_quantum_classical(
            distance_matrix=distance_matrix,
            num_vehicles=request.problem.num_vehicles,
            quantum_optimizers=quantum_optimizers,
            classical_algorithms=request.classical_algorithms,
            depot_index=request.problem.depot_index
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
        available = get_available_optimizers()
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
                result = solve_vrp_quantum(
                    distance_matrix=distance_matrix,
                    num_vehicles=problem.num_vehicles,
                    optimizer=optimizer,
                    p_layers=p_layers,
                    depot_index=problem.depot_index,
                    maxiter=max_iterations
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
    seed: int = Query(default=42, description="Random seed for reproducibility")
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
        
        return format_response({
            "problem": {
                "locations": test_case.locations,
                "num_vehicles": test_case.num_vehicles,
                "depot_index": test_case.depot_index
            },
            "metadata": {
                "name": test_case.name,
                "qubits_needed": qubits_needed,
                "quantum_feasible": True,
                "distance_matrix": test_case.distance_matrix.tolist()
            }
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

@app.get("/routing/services")
async def get_routing_services():
    return {
        "osrm": {
            "name": "OSRM",
            "description": "Open Source Routing Machine",
            "modes": ["road_osrm"],
            "profiles": ["driving", "walking", "cycling"]
        },
        "openroute": {
            "name": "OpenRouteService",
            "description": "OpenRouteService API",
            "modes": ["road_openroute"],
            "profiles": ["driving", "walking", "cycling"]
        }
    }

# POST /routing/route
@app.post("/routing/route")
async def get_route(req: RouteRequest):
    if len(req.coordinates) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 coordinates")
    calculator = await create_osrm_calculator(profile=req.profile)
    start, end = req.coordinates[0], req.coordinates[1]
    result = await calculator.calculate_distance(start, end)
    await calculator.cleanup()
    return {"route": result}

# POST /routing/matrix
@app.post("/routing/matrix")
async def get_matrix(req: MatrixRequest):
    if len(req.locations) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 locations")
    calculator = await create_osrm_calculator(profile=req.profile)
    matrix = await calculator.calculate_distance_matrix(req.locations)
    await calculator.cleanup()
    return {"matrix": matrix}
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