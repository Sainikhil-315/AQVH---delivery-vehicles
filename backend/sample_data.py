"""
Sample data for VRP testing based on research paper benchmarks.
Contains test cases of various sizes for quantum and classical comparison.
"""

import numpy as np
from typing import Dict, List, Tuple, Any

class VRPTestCase:
    """Container for VRP test case data"""
    
    def __init__(self, name: str, locations: List[Tuple[float, float]], 
                 num_vehicles: int, depot_index: int = 0):
        self.name = name
        self.locations = locations
        self.num_vehicles = num_vehicles
        self.depot_index = depot_index
        self.distance_matrix = self._calculate_distance_matrix()
        self.num_locations = len(locations)
    
    def _calculate_distance_matrix(self) -> np.ndarray:
        """Calculate Euclidean distance matrix between all locations"""
        n = len(self.locations)
        distances = np.zeros((n, n))
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    x1, y1 = self.locations[i]
                    x2, y2 = self.locations[j]
                    distances[i][j] = np.sqrt((x2 - x1)**2 + (y2 - y1)**2)
        
        return distances
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert test case to dictionary for API responses"""
        return {
            "name": self.name,
            "locations": self.locations,
            "num_vehicles": self.num_vehicles,
            "depot_index": self.depot_index,
            "num_locations": self.num_locations,
            "distance_matrix": self.distance_matrix.tolist()
        }

# Test cases based on VRP research benchmarks
TEST_CASES = {
    # Small problems suitable for quantum simulation (4-12 qubits)
    "small_4_2": VRPTestCase(
        name="Small Problem (4 locations, 2 vehicles)",
        locations=[
            (0.0, 0.0),    # Depot
            (2.0, 3.0),    # Customer 1
            (5.0, 1.0),    # Customer 2
            (3.0, 4.0)     # Customer 3
        ],
        num_vehicles=2
    ),
    
    "paper_5_2": VRPTestCase(
        name="Paper Example (5 locations, 2 vehicles)",
        locations=[
            (0.0, 0.0),    # Depot
            (1.0, 2.0),    # Customer 1
            (3.0, 1.0),    # Customer 2
            (4.0, 3.0),    # Customer 3
            (2.0, 4.0)     # Customer 4
        ],
        num_vehicles=2
    ),
    
    "medium_6_2": VRPTestCase(
        name="Medium Problem (6 locations, 2 vehicles)",
        locations=[
            (0.0, 0.0),    # Depot
            (2.0, 1.0),    # Customer 1
            (4.0, 0.0),    # Customer 2
            (5.0, 2.0),    # Customer 3
            (3.0, 3.0),    # Customer 4
            (1.0, 3.0)     # Customer 5
        ],
        num_vehicles=2
    ),
    
    "challenge_5_3": VRPTestCase(
        name="Challenge (5 locations, 3 vehicles)",
        locations=[
            (0.0, 0.0),    # Depot
            (2.0, 2.0),    # Customer 1
            (4.0, 1.0),    # Customer 2
            (1.0, 4.0),    # Customer 3
            (3.0, 3.0)     # Customer 4
        ],
        num_vehicles=3
    ),
    
    # Demo scenarios for presentation
    "demo_city": VRPTestCase(
        name="City Demo (Realistic coordinates)",
        locations=[
            (40.7128, -74.0060),  # NYC Depot (scaled)
            (40.7580, -73.9855),  # Times Square
            (40.7614, -73.9776),  # Central Park
            (40.7505, -73.9934),  # Empire State
            (40.7589, -73.9851)   # Broadway
        ],
        num_vehicles=2
    ),
    
    "optimal_test": VRPTestCase(
        name="Known Optimal (for validation)",
        locations=[
            (0.0, 0.0),    # Depot
            (1.0, 0.0),    # Customer 1 (distance 1)
            (0.0, 1.0),    # Customer 2 (distance 1)
            (1.0, 1.0)     # Customer 3 (distance sqrt(2))
        ],
        num_vehicles=2
    )
}

def get_test_case(name: str) -> VRPTestCase:
    """Get a specific test case by name"""
    if name not in TEST_CASES:
        raise ValueError(f"Test case '{name}' not found. Available: {list(TEST_CASES.keys())}")
    return TEST_CASES[name]

def get_all_test_cases() -> Dict[str, VRPTestCase]:
    """Get all available test cases"""
    return TEST_CASES.copy()

def create_random_test_case(num_locations: int, num_vehicles: int, 
                          seed: int = None) -> VRPTestCase:
    """Create a random test case for experimentation"""
    if seed is not None:
        np.random.seed(seed)
    
    # Generate random locations in a 10x10 grid
    locations = [(0.0, 0.0)]  # Depot at origin
    
    for i in range(num_locations - 1):
        x = np.random.uniform(0, 10)
        y = np.random.uniform(0, 10)
        locations.append((float(x), float(y)))
    
    return VRPTestCase(
        name=f"Random_{num_locations}_{num_vehicles}",
        locations=locations,
        num_vehicles=num_vehicles
    )

def validate_solution(test_case: VRPTestCase, solution: List[List[int]]) -> Dict[str, Any]:
    """
    Validate a VRP solution and calculate metrics
    
    Args:
        test_case: VRP test case
        solution: List of routes, each route is a list of location indices
    
    Returns:
        Dictionary with validation results and metrics
    """
    depot = test_case.depot_index
    distances = test_case.distance_matrix
    
    # Validation checks
    all_customers = set(range(1, test_case.num_locations))  # Exclude depot
    visited_customers = set()
    
    total_cost = 0.0
    route_costs = []
    
    for route_idx, route in enumerate(solution):
        route_cost = 0.0
        
        # Each route should start and end at depot
        if not route or route[0] != depot:
            route = [depot] + route
        if route[-1] != depot:
            route = route + [depot]
        
        # Calculate route cost
        for i in range(len(route) - 1):
            from_loc = route[i]
            to_loc = route[i + 1]
            route_cost += distances[from_loc][to_loc]
        
        route_costs.append(route_cost)
        total_cost += route_cost
        
        # Track visited customers
        for loc in route[1:-1]:  # Exclude depot visits
            if loc != depot:
                visited_customers.add(loc)
    
    # Check if all customers are visited
    unvisited = all_customers - visited_customers
    duplicate_visits = []
    
    # Check for duplicate visits
    customer_visits = {}
    for route in solution:
        for loc in route:
            if loc != depot:
                customer_visits[loc] = customer_visits.get(loc, 0) + 1
    
    for customer, count in customer_visits.items():
        if count > 1:
            duplicate_visits.append(customer)
    
    is_valid = len(unvisited) == 0 and len(duplicate_visits) == 0
    
    return {
        "is_valid": is_valid,
        "total_cost": total_cost,
        "route_costs": route_costs,
        "num_routes": len(solution),
        "unvisited_customers": list(unvisited),
        "duplicate_visits": duplicate_visits,
        "average_route_cost": total_cost / len(solution) if solution else 0.0,
        "solution": solution
    }

# Utility functions for quantum circuit sizing
def estimate_qubits_needed(num_locations: int, num_vehicles: int) -> int:
    """Estimate number of qubits needed for QAOA VRP formulation"""
    # Binary variables: x_ij for each location pair
    # For n locations, we need n*(n-1) qubits (no self-loops)
    return num_locations * (num_locations - 1)

def is_quantum_feasible(num_locations: int, max_qubits: int = 20) -> bool:
    """Check if problem size is feasible for quantum simulation"""
    needed_qubits = estimate_qubits_needed(num_locations, 1)  # Vehicles don't affect qubit count directly
    return needed_qubits <= max_qubits

def get_feasible_test_cases(max_qubits: int = 20) -> Dict[str, VRPTestCase]:
    """Get only test cases that are feasible for quantum simulation"""
    feasible = {}
    for name, test_case in TEST_CASES.items():
        if is_quantum_feasible(test_case.num_locations, max_qubits):
            feasible[name] = test_case
    return feasible

# Performance benchmarking utilities
class BenchmarkResult:
    """Container for algorithm benchmark results"""
    
    def __init__(self, algorithm_name: str, test_case_name: str):
        self.algorithm_name = algorithm_name
        self.test_case_name = test_case_name
        self.execution_time = 0.0
        self.solution_cost = float('inf')
        self.solution = []
        self.is_valid = False
        self.additional_metrics = {}
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "algorithm": self.algorithm_name,
            "test_case": self.test_case_name,
            "execution_time": self.execution_time,
            "solution_cost": self.solution_cost,
            "solution": self.solution,
            "is_valid": self.is_valid,
            **self.additional_metrics
        }

if __name__ == "__main__":
    # Test the sample data
    print("Available test cases:")
    for name, case in TEST_CASES.items():
        print(f"  {name}: {case.num_locations} locations, {case.num_vehicles} vehicles")
        qubits_needed = estimate_qubits_needed(case.num_locations, case.num_vehicles)
        feasible = is_quantum_feasible(case.num_locations)
        print(f"    Qubits needed: {qubits_needed}, Quantum feasible: {feasible}")
    
    # Test random generation
    random_case = create_random_test_case(4, 2, seed=42)
    print(f"\nRandom case: {random_case.name}")
    print(f"Locations: {random_case.locations}")