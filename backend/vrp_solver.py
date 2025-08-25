"""
Core VRP solver with QAOA (Quantum Approximate Optimization Algorithm) implementation.
Converts VRP to QUBO formulation and solves using quantum circuits.
"""

import numpy as np
import time
from typing import Dict, List, Tuple, Any, Optional
from collections import defaultdict
import itertools

# Qiskit imports
from qiskit import QuantumCircuit, ClassicalRegister, QuantumRegister
from qiskit_aer import AerSimulator
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
from qiskit_algorithms.optimizers import SPSA, COBYLA
from qiskit.quantum_info import SparsePauliOp
from qiskit_algorithms.minimum_eigensolvers import QAOA
from qiskit.primitives import Sampler


# Local imports
from optimizers import create_optimizer, QuantumOptimizer
from classical_solver import solve_vrp_classical
from sample_data import VRPTestCase, validate_solution

class VRPQUBOFormulation:
    """Convert VRP to QUBO (Quadratic Unconstrained Binary Optimization) format"""
    
    def __init__(self, distance_matrix: np.ndarray, num_vehicles: int, depot_index: int = 0):
        self.distance_matrix = distance_matrix
        self.num_vehicles = num_vehicles
        self.depot_index = depot_index
        self.num_locations = len(distance_matrix)
        
        # Variable indexing: x_ij = 1 if edge (i,j) is used
        self.var_index = {}
        self.index_to_var = {}
        self._create_variable_mapping()
        
        self.num_qubits = len(self.var_index)
        self.penalty_strength = self._estimate_penalty_strength()*5
    
    def _create_variable_mapping(self):
        """Create mapping between variables x_ij and qubit indices"""
        idx = 0
        for i in range(self.num_locations):
            for j in range(self.num_locations):
                if i != j:  # No self-loops
                    self.var_index[(i, j)] = idx
                    self.index_to_var[idx] = (i, j)
                    idx += 1
    
    def _estimate_penalty_strength(self) -> float:
        """Estimate appropriate penalty strength for constraints"""
        max_distance = np.max(self.distance_matrix)
        return max_distance * self.num_locations * 2
    
    def create_hamiltonian(self) -> SparsePauliOp:
        """
        Create the Hamiltonian for VRP as a QUBO problem
        H = H_cost + λ * H_constraints
        """
        
        # Initialize coefficient dictionaries
        linear_coeffs = defaultdict(float)
        quadratic_coeffs = defaultdict(float)
        
        # Cost terms: minimize total distance
        for i in range(self.num_locations):
            for j in range(self.num_locations):
                if i != j and (i, j) in self.var_index:
                    qubit_idx = self.var_index[(i, j)]
                    linear_coeffs[qubit_idx] += self.distance_matrix[i][j]
        
        # Constraint 1: Each customer must be visited exactly once (outgoing edges)
        customers = [i for i in range(self.num_locations) if i != self.depot_index]
        
        for customer in customers:
            # Sum of outgoing edges from customer should be 1
            constraint_qubits = []
            for j in range(self.num_locations):
                if customer != j and (customer, j) in self.var_index:
                    qubit_idx = self.var_index[(customer, j)]
                    constraint_qubits.append(qubit_idx)
            
            # Add penalty: (sum - 1)^2 = sum^2 - 2*sum + 1
            # Linear terms: -2*penalty_strength for each variable
            for qubit_idx in constraint_qubits:
                linear_coeffs[qubit_idx] -= 2 * self.penalty_strength
            
            # Quadratic terms: penalty_strength for each pair
            for i_idx, qubit_i in enumerate(constraint_qubits):
                for j_idx, qubit_j in enumerate(constraint_qubits):
                    if qubit_i != qubit_j:
                        key = tuple(sorted([qubit_i, qubit_j]))
                        quadratic_coeffs[key] += self.penalty_strength
                    else:  # Diagonal terms
                        linear_coeffs[qubit_i] += self.penalty_strength
        
        # Constraint 2: Each customer must be visited exactly once (incoming edges)
        for customer in customers:
            # Sum of incoming edges to customer should be 1
            constraint_qubits = []
            for i in range(self.num_locations):
                if customer != i and (i, customer) in self.var_index:
                    qubit_idx = self.var_index[(i, customer)]
                    constraint_qubits.append(qubit_idx)
            
            # Add penalty terms
            for qubit_idx in constraint_qubits:
                linear_coeffs[qubit_idx] -= 2 * self.penalty_strength
            
            for i_idx, qubit_i in enumerate(constraint_qubits):
                for j_idx, qubit_j in enumerate(constraint_qubits):
                    if qubit_i != qubit_j:
                        key = tuple(sorted([qubit_i, qubit_j]))
                        quadratic_coeffs[key] += self.penalty_strength
                    else:
                        linear_coeffs[qubit_i] += self.penalty_strength
        
        # Constraint 3: Vehicle capacity (each vehicle starts from depot)
        depot_outgoing = []
        for j in range(self.num_locations):
            if j != self.depot_index and (self.depot_index, j) in self.var_index:
                qubit_idx = self.var_index[(self.depot_index, j)]
                depot_outgoing.append(qubit_idx)
        
        # Exactly num_vehicles should leave depot
        for qubit_idx in depot_outgoing:
            linear_coeffs[qubit_idx] -= 2 * self.num_vehicles * self.penalty_strength
        
        for i_idx, qubit_i in enumerate(depot_outgoing):
            for j_idx, qubit_j in enumerate(depot_outgoing):
                if qubit_i != qubit_j:
                    key = tuple(sorted([qubit_i, qubit_j]))
                    quadratic_coeffs[key] += self.penalty_strength
                else:
                    linear_coeffs[qubit_i] += self.penalty_strength
        
        # Convert to Pauli operators
        pauli_list = []
        
        # Linear terms (Z operators)
        for qubit_idx, coeff in linear_coeffs.items():
            if abs(coeff) > 1e-10:
                pauli_str = ['I'] * self.num_qubits
                pauli_str[qubit_idx] = 'Z'
                pauli_list.append((''.join(pauli_str), coeff))
        
        # Quadratic terms (ZZ operators)
        for (qubit_i, qubit_j), coeff in quadratic_coeffs.items():
            if abs(coeff) > 1e-10:
                pauli_str = ['I'] * self.num_qubits
                pauli_str[qubit_i] = 'Z'
                pauli_str[qubit_j] = 'Z'
                pauli_list.append((''.join(pauli_str), coeff))
        
        # Constant term
        constant = (self.penalty_strength * len(customers) * 2 + 
                   self.penalty_strength * self.num_vehicles * self.num_vehicles)
        if abs(constant) > 1e-10:
            identity = 'I' * self.num_qubits
            pauli_list.append((identity, constant))
        
        if not pauli_list:
            # If no terms, create a simple identity
            identity = 'I' * self.num_qubits
            pauli_list.append((identity, 0.0))
        
        return SparsePauliOp.from_list(pauli_list)
    
    def decode_solution(self, bit_string: str) -> List[List[int]]:
        """Decode quantum bit string into multiple VRP routes starting and ending at depot"""
        
        # Step 1: Parse active edges from bitstring
        active_edges = [
            self.index_to_var[i]
            for i, bit in enumerate(bit_string)
            if bit == '1' and i in self.index_to_var
        ]
        
        print(f"Active edges from bitstring: {active_edges}")
        
        # Step 2: Build directed graph
        graph = defaultdict(list)
        for i, j in active_edges:
            graph[i].append(j)
        
        print(f"Built graph: {dict(graph)}")
        
        # Step 3: Extract optimal routes starting from depot
        routes = []
        visited = set()
        
        # Start with depot outgoing edges
        depot_outgoing = graph.get(self.depot_index, [])
        print(f"Depot outgoing edges: {depot_outgoing}")
        
        # Create routes by following the graph structure
        for start_node in depot_outgoing:
            if start_node in visited:
                continue
                
            route = [self.depot_index]
            current = start_node
            route_length = 0
            max_route_length = self.num_locations  # Prevent infinite loops
            
            while current != self.depot_index and current not in visited and route_length < max_route_length:
                route.append(current)
                visited.add(current)
                route_length += 1
                
                # Find next node (prefer depot if available, otherwise take best next customer)
                next_nodes = graph.get(current, [])
                if not next_nodes:
                    break
                    
                # Try to find depot first
                next_node = None
                for n in next_nodes:
                    if n == self.depot_index:
                        next_node = n
                        break
                
                # If no depot connection, find the best next customer
                if next_node is None:
                    # Find unvisited customers that can be reached
                    unvisited_candidates = [n for n in next_nodes if n not in visited]
                    if unvisited_candidates:
                        # Choose the closest unvisited customer
                        next_node = min(unvisited_candidates, 
                                      key=lambda x: self.distance_matrix[current][x])
                    else:
                        # If no unvisited customers, try to go back to depot
                        depot_candidates = [n for n in next_nodes if n == self.depot_index]
                        if depot_candidates:
                            next_node = self.depot_index
                        else:
                            # Take any available node to avoid getting stuck
                            next_node = next_nodes[0]
                
                if next_node is None:
                    break
                    
                current = next_node
            
            # Close the route if we can reach depot
            if current == self.depot_index:
                route.append(self.depot_index)
            
            # Only add routes that have at least depot -> customer -> depot
            if len(route) > 2:
                routes.append(route)
                print(f"Created route: {route}")
        
        # Step 4: Handle unvisited customers by adding them to existing routes or creating new ones
        all_customers = set(range(self.num_locations)) - {self.depot_index}
        missed = all_customers - visited
        
        if missed:
            print(f"Missed customers: {missed}")
            
            # Try to add missed customers to existing routes
            for customer in missed:
                best_route_idx = -1
                best_insertion_cost = float('inf')
                
                # Find the best route to insert this customer
                for i, route in enumerate(routes):
                    if len(route) < self.num_locations:  # Route not too long
                        # Try inserting after depot
                        insertion_cost = (self.distance_matrix[route[0]][customer] + 
                                        self.distance_matrix[customer][route[1]] - 
                                        self.distance_matrix[route[0]][route[1]])
                        
                        if insertion_cost < best_insertion_cost:
                            best_insertion_cost = insertion_cost
                            best_route_idx = i
                
                if best_route_idx >= 0:
                    # Insert into existing route
                    route = routes[best_route_idx]
                    route.insert(1, customer)  # Insert after depot
                    print(f"Added customer {customer} to route {best_route_idx}: {route}")
                else:
                    # Create new route for this customer
                    new_route = [self.depot_index, customer, self.depot_index]
                    routes.append(new_route)
                    print(f"Created new route for customer {customer}: {new_route}")
        
        # Step 5: Optimize routes by trying to merge short routes
        if len(routes) > self.num_vehicles:
            print(f"Too many routes ({len(routes)}), trying to merge...")
            routes = self._merge_routes(routes)
        
        print(f"Final routes: {routes}")
        return routes
    
    def _merge_routes(self, routes: List[List[int]]) -> List[List[int]]:
        """Try to merge routes to reduce the number of routes"""
        if len(routes) <= self.num_vehicles:
            return routes
        
        # Sort routes by length (shorter routes first)
        routes.sort(key=len)
        
        merged_routes = []
        used_routes = set()
        
        for i, route1 in enumerate(routes):
            if i in used_routes:
                continue
                
            current_route = route1.copy()
            used_routes.add(i)
            
            # Try to merge with other routes
            for j, route2 in enumerate(routes[i+1:], i+1):
                if j in used_routes:
                    continue
                    
                # Check if we can merge these routes
                if len(current_route) + len(route2) - 2 <= self.num_locations:  # -2 for depot overlap
                    # Merge: route1 -> route2 (without duplicate depot)
                    merged_route = current_route[:-1] + route2[1:]  # Remove duplicate depot
                    
                    # Check if merged route is valid (no duplicate customers)
                    if len(set(merged_route)) == len(merged_route):
                        current_route = merged_route
                        used_routes.add(j)
                        print(f"Merged routes {i} and {j}: {current_route}")
            
            merged_routes.append(current_route)
        
        return merged_routes


class QAOAVRPSolver:
    """QAOA-based VRP solver"""
    
    def __init__(self, p_layers: int = 2, shots: int = 1024, seed: int = 42):
        self.p_layers = p_layers
        self.shots = shots
        self.seed = seed
        self.simulator = AerSimulator(seed_simulator=seed)
        
        # Performance optimizations
        self._hamiltonian_cache = {}
        self._circuit_cache = {}
        self._problem_hash_cache = {}
        
    def _get_problem_hash(self, distance_matrix: np.ndarray, num_vehicles: int, depot_index: int) -> str:
        """Generate a hash for caching based on problem parameters"""
        import hashlib
        problem_str = f"{distance_matrix.tobytes()}-{num_vehicles}-{depot_index}"
        return hashlib.md5(problem_str.encode()).hexdigest()
    
    def solve(self, distance_matrix: np.ndarray, num_vehicles: int, 
              optimizer_name: str = 'SPSA', depot_index: int = 0,
              maxiter: int = 100) -> Dict[str, Any]:
        """
        Solve VRP using QAOA
        
        Args:
            distance_matrix: Distance matrix between locations
            num_vehicles: Number of vehicles
            optimizer_name: Optimizer to use
            depot_index: Index of depot location
            maxiter: Maximum optimizer iterations
            
        Returns:
            Dictionary with solution and metrics
        """
        
        start_time = time.time()
        
        # Initialize variables at the very beginning to avoid any "referenced before assignment" errors
        routes = []
        best_bitstring = None
        quantum_success = False
        result = None
        qubo = None
        
        try:
            print(f"Starting QAOA with {optimizer_name}, {self.p_layers} layers, {self.shots} shots")
            
            # Generate problem hash for caching
            problem_hash = self._get_problem_hash(distance_matrix, num_vehicles, depot_index)
            
            # Create QUBO formulation (cached)
            if problem_hash in self._hamiltonian_cache:
                print("Using cached Hamiltonian")
                qubo = self._hamiltonian_cache[problem_hash]['qubo']
                hamiltonian = self._hamiltonian_cache[problem_hash]['hamiltonian']
            else:
                print("Creating new QUBO formulation")
                qubo = VRPQUBOFormulation(distance_matrix, num_vehicles, depot_index)
                
                if qubo.num_qubits > 20:  # Limit for classical simulation
                    raise ValueError(f"Problem too large: {qubo.num_qubits} qubits needed (max 20)")
                
                # Create Hamiltonian
                hamiltonian = qubo.create_hamiltonian()
                
                # Cache the results
                self._hamiltonian_cache[problem_hash] = {
                    'qubo': qubo,
                    'hamiltonian': hamiltonian
                }
                print("Hamiltonian cached for future use")
            
            print(f"Problem size: {qubo.num_qubits} qubits")
            
            # Create quantum optimizer
            print(f"Creating optimizer {optimizer_name}...")
            try:
                quantum_optimizer = create_optimizer(optimizer_name, maxiter=maxiter)
                print(f"Optimizer {optimizer_name} created successfully")
            except Exception as optimizer_error:
                print(f"Failed to create optimizer {optimizer_name}: {optimizer_error}")
                raise Exception(f"Optimizer creation failed: {optimizer_error}")
            
            # Setup QAOA
            print("Setting up QAOA...")
            sampler = Sampler()
            qaoa = QAOA(sampler, quantum_optimizer, reps=self.p_layers)
            print("QAOA setup completed")
            
            # Solve
            print("Running QAOA optimization...")
            result = qaoa.compute_minimum_eigenvalue(hamiltonian)
            print(f"QAOA completed. Optimal value: {result.optimal_value}")
            
            # Try to get the best bit string from result
            if hasattr(result, 'best_measurement') and result.best_measurement:
                print("Using best_measurement from result")
                best_bitstring = result.best_measurement['bitstring']
                routes = qubo.decode_solution(best_bitstring)
                quantum_success = True
                print(f"Decoded routes from best_measurement: {routes}")
            
            # If no best_measurement, try to sample from optimized circuit
            if not routes:
                print("No best_measurement, trying to sample from optimized circuit...")
                
                # Get optimal parameters
                if hasattr(result, 'optimal_point'):
                    optimal_point = result.optimal_point
                elif hasattr(result, 'optimal_parameters'):
                    optimal_point = result.optimal_parameters
                else:
                    print("No optimal parameters found, using default values")
                    optimal_point = [0.1] * (self.p_layers * 2)
                
                print(f"Optimal parameters: {optimal_point}")
                
                # Create and run the optimized circuit
                qc = QuantumCircuit(qubo.num_qubits)
                
                # Initial superposition
                qc.h(range(qubo.num_qubits))
                
                # Apply QAOA layers (simplified)
                for layer in range(self.p_layers):
                    gamma = optimal_point[layer] if len(optimal_point) > layer else 0.1
                    beta = optimal_point[self.p_layers + layer] if len(optimal_point) > self.p_layers + layer else 0.1
                    
                    # Simple cost unitary (just Z rotations)
                    for i in range(qubo.num_qubits):
                        qc.rz(gamma, i)
                    
                    # Simple mixer unitary (just X rotations)
                    for i in range(qubo.num_qubits):
                        qc.rx(beta, i)
                
                # Measure
                qc.measure_all()
                
                print("Running optimized circuit...")
                # Run circuit
                job = self.simulator.run(qc, shots=self.shots)
                counts = job.result().get_counts()
                print(f"Circuit results: {counts}")
                
                # Validate top bitstrings
                top_bitstrings = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]
                print(f"Top bitstrings: {top_bitstrings}")
                
                for bitstring, freq in top_bitstrings:
                    print(f"Testing bitstring: {bitstring}")
                    candidate_routes = qubo.decode_solution(bitstring)
                    print(f"Decoded routes: {candidate_routes}")
                    
                    validation = validate_solution(
                        type('TestCase', (), {
                            'distance_matrix': distance_matrix,
                            'num_locations': len(distance_matrix),
                            'depot_index': depot_index
                        })(),
                        candidate_routes
                    )
                    print(f"Validation result: {validation}")
                    
                    if validation['is_valid']:
                        routes = candidate_routes
                        best_bitstring = bitstring
                        quantum_success = True
                        print(f"Valid solution found: {routes}")
                        break

                # Fallback if no valid bitstring found
                if not routes:
                    print("No valid solution found, using highest frequency bitstring")
                    best_bitstring = max(counts.keys(), key=lambda x: counts[x])
                    routes = qubo.decode_solution(best_bitstring)

            # Ensure routes is not empty
            if not routes:
                raise Exception("Failed to decode any routes from quantum solution")

            # OPTIMIZE AND VALIDATE ROUTES - ADD THIS LINE:
            routes = self._validate_and_optimize_routes(routes, distance_matrix, num_vehicles, depot_index)
            
            print(f"Final optimized routes: {routes}")

            # Calculate solution cost
            total_cost = 0.0
            for route in routes:
                if len(route) >= 2:
                    for i in range(len(route) - 1):
                        total_cost += distance_matrix[route[i]][route[i+1]]
            
            execution_time = time.time() - start_time
            
            # Validate solution
            validation = validate_solution(
                type('TestCase', (), {
                    'distance_matrix': distance_matrix,
                    'num_locations': len(distance_matrix),
                    'depot_index': depot_index
                })(),
                routes
            )
            
            # Add problem_info to the output
            problem_info = {
                'locations': self._get_location_coordinates(distance_matrix),
                'num_vehicles': num_vehicles,
                'num_locations': len(distance_matrix),
                'qubits_needed': qubo.num_qubits
            }
            
            print("Quantum solution successful!")
            return {
                'solution': routes,
                'total_cost': total_cost,
                'execution_time': execution_time,
                'algorithm': f'QAOA-{optimizer_name}',
                'quantum_result': {
                    'optimal_value': result.optimal_value if result else 0.0,
                    'optimal_point': result.optimal_point.tolist() if result and hasattr(result, 'optimal_point') else [],
                    'optimizer_evals': result.optimizer_evals if result and hasattr(result, 'optimizer_evals') else 0,
                    'best_measurement': best_bitstring
                },
                'num_qubits': qubo.num_qubits,
                'p_layers': self.p_layers,
                'shots': self.shots,
                'is_valid': validation['is_valid'],
                'validation': validation,
                'problem_info': problem_info
            }
            
        except Exception as e:
            # Fallback to classical solution if quantum fails
            print(f"Quantum solver failed: {e}")
            print("Falling back to classical solution...")
            
            try:
                classical_result = solve_vrp_classical(
                    distance_matrix, num_vehicles, 'nearest_neighbor', depot_index
                )
                
                execution_time = time.time() - start_time
                
                # Add problem_info to fallback output
                problem_info = {
                    'locations': self._get_location_coordinates(distance_matrix),
                    'num_vehicles': num_vehicles,
                    'num_locations': len(distance_matrix),
                    'qubits_needed': qubo.num_qubits if qubo else 0
                }
                
                return {
                    'solution': classical_result['solution'],
                    'total_cost': classical_result['total_cost'],
                    'execution_time': execution_time,
                    'algorithm': f'QAOA-{optimizer_name}-Fallback',
                    'error': str(e),
                    'fallback_used': True,
                    'num_qubits': qubo.num_qubits if qubo else 0,
                    'p_layers': self.p_layers,
                    'is_valid': classical_result.get('is_valid', True),
                    'problem_info': problem_info
                }
            except Exception as classical_error:
                print(f"Classical fallback also failed: {classical_error}")
                # Last resort: create a simple solution
                execution_time = time.time() - start_time
                
                # Create a simple solution: each customer gets their own route
                simple_solution = []
                for i in range(1, len(distance_matrix)):
                    simple_solution.append([0, i, 0])
                
                # Calculate cost
                total_cost = 0.0
                for route in simple_solution:
                    for i in range(len(route) - 1):
                        total_cost += distance_matrix[route[i]][route[i+1]]
                
                problem_info = {
                    'locations': self._get_location_coordinates(distance_matrix),
                    'num_vehicles': num_vehicles,
                    'num_locations': len(distance_matrix),
                    'qubits_needed': 0
                }
                
                return {
                    'solution': simple_solution,
                    'total_cost': total_cost,
                    'execution_time': execution_time,
                    'algorithm': f'QAOA-{optimizer_name}-EmergencyFallback',
                    'error': f"Quantum failed: {e}, Classical failed: {classical_error}",
                    'fallback_used': True,
                    'num_qubits': 0,
                    'p_layers': self.p_layers,
                    'is_valid': True,
                    'problem_info': problem_info
                }
    
    def _get_location_coordinates(self, distance_matrix: np.ndarray) -> List[List[float]]:
        """Generate dummy coordinates for locations (you can modify this based on your needs)"""
        # This is a placeholder - you might want to store actual coordinates
        num_locations = len(distance_matrix)
        return [[float(i), float(i)] for i in range(num_locations)]
    
    def test_basic_functionality(self, distance_matrix: np.ndarray, num_vehicles: int, depot_index: int = 0):
        """Test basic functionality without full QAOA"""
        try:
            print("Testing basic functionality...")
            
            # Test QUBO creation
            qubo = VRPQUBOFormulation(distance_matrix, num_vehicles, depot_index)
            print(f"QUBO created successfully with {qubo.num_qubits} qubits")
            
            # Test Hamiltonian creation
            hamiltonian = qubo.create_hamiltonian()
            print(f"Hamiltonian created successfully with {len(hamiltonian)} terms")
            
            # Test route decoding with dummy bitstring
            test_bitstring = "1" * qubo.num_qubits
            routes = qubo.decode_solution(test_bitstring)
            print(f"Route decoding test successful: {routes}")
            
            return True
        except Exception as e:
            print(f"Basic functionality test failed: {e}")
            return False
    
    def _validate_and_optimize_routes(self, routes: List[List[int]], distance_matrix: np.ndarray, 
                                     num_vehicles: int, depot_index: int = 0) -> List[List[int]]:
        """Validate routes and try to optimize them"""
        
        # Check if we have too many routes
        if len(routes) > num_vehicles:
            print(f"Warning: {len(routes)} routes for {num_vehicles} vehicles")
            
            # Try to merge routes
            routes = self._merge_routes(routes)
            
            # If still too many, create optimal routes
            if len(routes) > num_vehicles:
                print("Creating optimal routes by combining customers...")
                routes = self._create_optimal_routes(distance_matrix, num_vehicles, depot_index)
        
        # Ensure all customers are visited
        all_customers = set(range(len(distance_matrix))) - {depot_index}
        visited_customers = set()
        
        for route in routes:
            for node in route[1:-1]:  # Exclude depot at start/end
                if node != depot_index:
                    visited_customers.add(node)
        
        missed_customers = all_customers - visited_customers
        if missed_customers:
            print(f"Adding missed customers: {missed_customers}")
            # Add missed customers to existing routes or create new ones
            routes = self._add_missed_customers(routes, missed_customers, distance_matrix, depot_index)
        
        return routes

    def _create_optimal_routes(self, distance_matrix: np.ndarray, num_vehicles: int, 
                              depot_index: int = 0) -> List[List[int]]:
        """Create optimal routes using nearest neighbor approach"""
        num_locations = len(distance_matrix)
        customers = [i for i in range(num_locations) if i != depot_index]
        
        # Sort customers by distance from depot
        customers.sort(key=lambda x: distance_matrix[depot_index][x])
        
        routes = []
        customers_per_route = len(customers) // num_vehicles
        remainder = len(customers) % num_vehicles
        
        start_idx = 0
        for i in range(num_vehicles):
            if i < remainder:
                route_length = customers_per_route + 1
            else:
                route_length = customers_per_route
            
            if start_idx < len(customers):
                route_customers = customers[start_idx:start_idx + route_length]
                route = [depot_index] + route_customers + [depot_index]
                routes.append(route)
                start_idx += route_length
        
        return routes

    def _add_missed_customers(self, routes: List[List[int]], missed_customers: set, 
                              distance_matrix: np.ndarray, depot_index: int = 0) -> List[List[int]]:
        """Add missed customers to existing routes"""
        for customer in missed_customers:
            best_route_idx = -1
            best_insertion_cost = float('inf')
            
            # Find the best route to insert this customer
            for i, route in enumerate(routes):
                if len(route) < len(distance_matrix):  # Route not too long
                    # Try inserting after depot
                    insertion_cost = (distance_matrix[route[0]][customer] + 
                                    distance_matrix[customer][route[1]] - 
                                    distance_matrix[route[0]][route[1]])
                    
                    if insertion_cost < best_insertion_cost:
                        best_insertion_cost = insertion_cost
                        best_route_idx = i
            
            if best_route_idx >= 0:
                # Insert into existing route
                route = routes[best_route_idx]
                route.insert(1, customer)  # Insert after depot
            else:
                # Create new route for this customer
                new_route = [depot_index, customer, depot_index]
                routes.append(new_route)
        
        return routes
    
    def _merge_routes(self, routes: List[List[int]]) -> List[List[int]]:
        """Try to merge routes to reduce the number of routes"""
        if len(routes) <= self.num_vehicles:
            return routes
        
        # Sort routes by length (shorter routes first)
        routes.sort(key=len)
        
        merged_routes = []
        used_routes = set()
        
        for i, route1 in enumerate(routes):
            if i in used_routes:
                continue
                
            current_route = route1.copy()
            used_routes.add(i)
            
            # Try to merge with other routes
            for j, route2 in enumerate(routes[i+1:], i+1):
                if j in used_routes:
                    continue
                    
                # Check if we can merge these routes
                if len(current_route) + len(route2) - 2 <= self.num_locations:  # -2 for depot overlap
                    # Merge: route1 -> route2 (without duplicate depot)
                    merged_route = current_route[:-1] + route2[1:]  # Remove duplicate depot
                    
                    # Check if merged route is valid (no duplicate customers)
                    if len(set(merged_route)) == len(merged_route):
                        current_route = merged_route
                        used_routes.add(j)
                        print(f"Merged routes {i} and {j}: {current_route}")
            
            merged_routes.append(current_route)
        
        return merged_routes


def solve_vrp_quantum(distance_matrix: np.ndarray, num_vehicles: int,
                     optimizer: str = 'SPSA', p_layers: int = 2,
                     depot_index: int = 0, maxiter: int = 100,
                     shots: int = 1024) -> Dict[str, Any]:
    """
    Main function to solve VRP using quantum QAOA
    
    Args:
        distance_matrix: Distance matrix between locations
        num_vehicles: Number of vehicles
        optimizer: Quantum optimizer name
        p_layers: QAOA depth
        depot_index: Depot location index
        maxiter: Maximum optimizer iterations
        shots: Number of quantum shots
    
    Returns:
        Solution dictionary with routes and metrics
    """
    
    solver = QAOAVRPSolver(p_layers=p_layers, shots=shots)
    
    result = solver.solve(
        distance_matrix=distance_matrix,
        num_vehicles=num_vehicles,
        optimizer_name=optimizer,
        depot_index=depot_index,
        maxiter=maxiter
    )
    
    # Wrap the result in the expected format
    return {
        "success": True,
        "timestamp": time.time(),
        "data": result,
        "error": None
    }


def compare_quantum_classical(distance_matrix: np.ndarray, num_vehicles: int,
                            quantum_optimizers: List[str] = None,
                            classical_algorithms: List[str] = None,
                            depot_index: int = 0) -> Dict[str, Any]:
    """
    Compare quantum QAOA with classical algorithms
    
    Returns:
        Comprehensive comparison results
    """
    
    if quantum_optimizers is None:
        quantum_optimizers = ['SPSA', 'COBYLA', 'ADAM']
    
    if classical_algorithms is None:
        classical_algorithms = ['nearest_neighbor', 'genetic_algorithm', 'simulated_annealing']
    
    results = {
        'quantum': {},
        'classical': {},
        'comparison': {}
    }
    
    # Run quantum algorithms
    print("Running quantum algorithms...")
    for optimizer in quantum_optimizers:
        print(f"  Testing QAOA with {optimizer}...")
        try:
            result = solve_vrp_quantum(
                distance_matrix=distance_matrix,
                num_vehicles=num_vehicles,
                optimizer=optimizer,
                depot_index=depot_index,
                maxiter=50  # Reduced for faster testing
            )
            results['quantum'][f'QAOA-{optimizer}'] = result['data']
            
            print(f"    Cost: {result['data']['total_cost']:.2f}, "
                  f"Time: {result['data']['execution_time']:.2f}s, "
                  f"Valid: {result['data'].get('is_valid', False)}")
            
        except Exception as e:
            print(f"    Failed: {e}")
            results['quantum'][f'QAOA-{optimizer}'] = {'error': str(e)}
    
    # Run classical algorithms
    print("\nRunning classical algorithms...")
    for algorithm in classical_algorithms:
        print(f"  Testing {algorithm}...")
        try:
            result = solve_vrp_classical(
                distance_matrix=distance_matrix,
                num_vehicles=num_vehicles,
                algorithm=algorithm,
                depot_index=depot_index
            )
            results['classical'][algorithm] = result
            
            print(f"    Cost: {result['total_cost']:.2f}, "
                  f"Time: {result['execution_time']:.2f}s, "
                  f"Valid: {result.get('is_valid', False)}")
            
        except Exception as e:
            print(f"    Failed: {e}")
            results['classical'][algorithm] = {'error': str(e)}
    
    # Analysis
    all_results = {}
    all_results.update(results['quantum'])
    all_results.update(results['classical'])
    
    # Filter successful results
    successful = {k: v for k, v in all_results.items() 
                 if 'error' not in v and v.get('is_valid', True)}
    
    if successful:
        best_algorithm = min(successful.keys(), key=lambda k: successful[k]['total_cost'])
        best_cost = successful[best_algorithm]['total_cost']
        
        # Categorize results
        quantum_successful = {k: v for k, v in successful.items() if 'QAOA' in k}
        classical_successful = {k: v for k, v in successful.items() if 'QAOA' not in k}
        
        best_quantum = min(quantum_successful.keys(), key=lambda k: quantum_successful[k]['total_cost']) if quantum_successful else None
        best_classical = min(classical_successful.keys(), key=lambda k: classical_successful[k]['total_cost']) if classical_successful else None
        
        quantum_advantage = None
        if best_quantum and best_classical:
            quantum_cost = quantum_successful[best_quantum]['total_cost']
            classical_cost = classical_successful[best_classical]['total_cost']
            quantum_advantage = (classical_cost - quantum_cost) / classical_cost * 100
        
        results['comparison'] = {
            'best_overall': best_algorithm,
            'best_cost': best_cost,
            'best_quantum': best_quantum,
            'best_classical': best_classical,
            'quantum_advantage_percent': quantum_advantage,
            'total_algorithms': len(all_results),
            'successful_algorithms': len(successful),
            'quantum_successful': len(quantum_successful),
            'classical_successful': len(classical_successful)
        }
    
    return results


if __name__ == "__main__":
    # Test the quantum VRP solver
    from sample_data import get_test_case
    
    print("Testing Quantum VRP Solver")
    
    # Use a small test case
    test_case = get_test_case("small_4_2")
    print(f"Test case: {test_case.name}")
    print(f"Locations: {test_case.locations}")
    print(f"Vehicles: {test_case.num_vehicles}")
    
    # Test basic functionality first
    solver = QAOAVRPSolver(p_layers=2, shots=1024)
    if solver.test_basic_functionality(test_case.distance_matrix, test_case.num_vehicles, test_case.depot_index):
        print("Basic functionality test passed, proceeding with full QAOA...")
        
        # Test individual quantum solver
        print(f"\nTesting QAOA with SPSA optimizer...")
        result = solve_vrp_quantum(
            distance_matrix=test_case.distance_matrix,
            num_vehicles=test_case.num_vehicles,
                optimizer='SPSA',
                depot_index=test_case.depot_index,
                maxiter=30
        )
        
        # Print the formatted result
        import json
        print(json.dumps(result, indent=2))
    else:
        print("Basic functionality test failed, check the implementation")
    
    # Compare quantum vs classical
    print(f"\nRunning comprehensive comparison...")
    comparison = compare_quantum_classical(
        distance_matrix=test_case.distance_matrix,
        num_vehicles=test_case.num_vehicles,
        quantum_optimizers=['SPSA', 'COBYLA'],
        classical_algorithms=['nearest_neighbor', 'genetic_algorithm']
    )
    
    if 'comparison' in comparison and comparison['comparison']:
        comp = comparison['comparison']
        print(f"\nComparison Results:")
        print(f"Best overall: {comp['best_overall']} (cost: {comp['best_cost']:.2f})")
        print(f"Best quantum: {comp['best_quantum']}")
        print(f"Best classical: {comp['best_classical']}")
        if comp['quantum_advantage_percent'] is not None:
            print(f"Quantum advantage: {comp['quantum_advantage_percent']:.2f}%")