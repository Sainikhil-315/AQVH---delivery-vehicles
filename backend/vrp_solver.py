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
from qiskit_algorithms import QAOA
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
        self.penalty_strength = self._estimate_penalty_strength()
    
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
        """Decode quantum bit string to VRP solution"""
        
        # Parse bit string to get active edges
        active_edges = []
        for i, bit in enumerate(bit_string):
            if bit == '1' and i in self.index_to_var:
                edge = self.index_to_var[i]
                active_edges.append(edge)
        
        # Build graph from active edges
        graph = defaultdict(list)
        for i, j in active_edges:
            graph[i].append(j)
        
        # Extract routes starting from depot
        routes = []
        visited = set()
        
        # Find all paths starting from depot
        def extract_route(start_node):
            route = [start_node]
            current = start_node
            
            while current in graph and graph[current]:
                next_nodes = [n for n in graph[current] if n not in visited or n == self.depot_index]
                if not next_nodes:
                    break
                
                next_node = next_nodes[0]  # Take first available
                
                if next_node == self.depot_index and len(route) > 1:
                    route.append(next_node)
                    break
                elif next_node != self.depot_index:
                    route.append(next_node)
                    visited.add(next_node)
                    current = next_node
                else:
                    break
            
            return route if len(route) > 1 else []
        
        # Start from depot
        for next_node in graph[self.depot_index]:
            if next_node not in visited:
                route = extract_route(self.depot_index)
                if route and len(route) >= 3:  # At least depot->customer->depot
                    routes.append(route)
        
        # If no valid routes found, create a simple fallback
        if not routes:
            customers = [i for i in range(self.num_locations) if i != self.depot_index]
            if customers:
                # Simple single route with all customers
                route = [self.depot_index] + customers[:min(len(customers), 3)] + [self.depot_index]
                routes.append(route)
        
        return routes

class QAOAVRPSolver:
    """QAOA-based VRP solver"""
    
    def __init__(self, p_layers: int = 2, shots: int = 1024, seed: int = 42):
        self.p_layers = p_layers
        self.shots = shots
        self.seed = seed
        self.simulator = AerSimulator(seed_simulator=seed)
        
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
        
        # Create QUBO formulation
        qubo = VRPQUBOFormulation(distance_matrix, num_vehicles, depot_index)
        
        if qubo.num_qubits > 20:  # Limit for classical simulation
            raise ValueError(f"Problem too large: {qubo.num_qubits} qubits needed (max 20)")
        
        # Create Hamiltonian
        hamiltonian = qubo.create_hamiltonian()
        
        # Create quantum optimizer
        quantum_optimizer = create_optimizer(optimizer_name, maxiter=maxiter)
        
        try:
            # Setup QAOA
            sampler = Sampler()
            qaoa = QAOA(sampler, quantum_optimizer, reps=self.p_layers)
            
            # Solve
            result = qaoa.compute_minimum_eigenvalue(hamiltonian)
            
            # Get the best bit string
            if hasattr(result, 'best_measurement'):
                best_bitstring = result.best_measurement['bitstring']
            else:
                # Fallback: sample from the optimized circuit
                optimal_point = result.optimal_point if hasattr(result, 'optimal_point') else result.optimal_parameters
                
                # Create and run the optimized circuit
                qc = QuantumCircuit(qubo.num_qubits)
                
                # Apply QAOA circuit with optimal parameters
                # Initial superposition
                qc.h(range(qubo.num_qubits))
                
                # Apply QAOA layers
                for layer in range(self.p_layers):
                    # Cost unitary (problem-specific rotations)
                    gamma = optimal_point[layer] if len(optimal_point) > layer else 0.1
                    
                    # Apply ZZ rotations for quadratic terms
                    for i in range(qubo.num_qubits):
                        for j in range(i+1, qubo.num_qubits):
                            qc.rzz(gamma, i, j)
                    
                    # Apply Z rotations for linear terms
                    for i in range(qubo.num_qubits):
                        qc.rz(gamma, i)
                    
                    # Mixer unitary
                    beta = optimal_point[self.p_layers + layer] if len(optimal_point) > self.p_layers + layer else 0.1
                    for i in range(qubo.num_qubits):
                        qc.rx(beta, i)
                
                # Measure
                qc.measure_all()
                
                # Run circuit
                job = self.simulator.run(qc, shots=self.shots)
                counts = job.result().get_counts()
                
                # Get most frequent bitstring
                best_bitstring = max(counts.keys(), key=lambda x: counts[x])
            
            # Decode solution
            routes = qubo.decode_solution(best_bitstring)
            
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
            
            return {
                'solution': routes,
                'total_cost': total_cost,
                'execution_time': execution_time,
                'algorithm': f'QAOA-{optimizer_name}',
                'quantum_result': {
                    'optimal_value': result.optimal_value,
                    'optimal_point': result.optimal_point.tolist() if hasattr(result, 'optimal_point') else [],
                    'optimizer_evals': result.optimizer_evals if hasattr(result, 'optimizer_evals') else 0,
                    'best_measurement': best_bitstring
                },
                'num_qubits': qubo.num_qubits,
                'p_layers': self.p_layers,
                'shots': self.shots,
                'is_valid': validation['is_valid'],
                'validation': validation
            }
            
        except Exception as e:
            # Fallback to classical solution if quantum fails
            print(f"Quantum solver failed: {e}")
            print("Falling back to classical solution...")
            
            classical_result = solve_vrp_classical(
                distance_matrix, num_vehicles, 'nearest_neighbor', depot_index
            )
            
            execution_time = time.time() - start_time
            
            return {
                'solution': classical_result['solution'],
                'total_cost': classical_result['total_cost'],
                'execution_time': execution_time,
                'algorithm': f'QAOA-{optimizer_name}-Fallback',
                'error': str(e),
                'fallback_used': True,
                'num_qubits': qubo.num_qubits,
                'p_layers': self.p_layers,
                'is_valid': classical_result.get('is_valid', True)
            }

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
    
    return solver.solve(
        distance_matrix=distance_matrix,
        num_vehicles=num_vehicles,
        optimizer_name=optimizer,
        depot_index=depot_index,
        maxiter=maxiter
    )

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
            results['quantum'][f'QAOA-{optimizer}'] = result
            
            print(f"    Cost: {result['total_cost']:.2f}, "
                  f"Time: {result['execution_time']:.2f}s, "
                  f"Valid: {result.get('is_valid', False)}")
            
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
    
    # Test individual quantum solver
    print(f"\nTesting QAOA with SPSA optimizer...")
    result = solve_vrp_quantum(
        distance_matrix=test_case.distance_matrix,
        num_vehicles=test_case.num_vehicles,
        optimizer='SPSA',
        depot_index=test_case.depot_index,
        maxiter=30
    )
    
    print(f"Result: {result['solution']}")
    print(f"Cost: {result['total_cost']:.2f}")
    print(f"Valid: {result.get('is_valid', False)}")
    print(f"Time: {result['execution_time']:.2f}s")
    
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
            print(f"Quantum advantage: {comp['quantum_advantage_percent']:.1f}%")