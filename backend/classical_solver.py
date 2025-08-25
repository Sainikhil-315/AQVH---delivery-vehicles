"""
Advanced classical solvers for Vehicle Routing Problem (VRP).
Includes Genetic Algorithm, Simulated Annealing, Nearest Neighbor, and Branch & Bound.
"""

import numpy as np
import random
import time
import math
from typing import List, Tuple, Dict, Any, Optional
from abc import ABC, abstractmethod
from scipy.optimize import minimize
import itertools
from copy import deepcopy

class ClassicalSolver(ABC):
    """Base class for classical VRP solvers"""
    
    def __init__(self, name: str):
        self.name = name
        self.execution_time = 0.0
        self.iterations = 0
        
    @abstractmethod
    def solve(self, distance_matrix: np.ndarray, num_vehicles: int, 
              depot_index: int = 0) -> Dict[str, Any]:
        """Solve the VRP and return solution with metrics"""
        pass
    
    def _calculate_route_cost(self, route: List[int], distance_matrix: np.ndarray) -> float:
        """Calculate the total cost of a route using vectorized operations"""
        if len(route) < 2:
            return 0.0
        
        # Use numpy indexing for faster computation
        route_array = np.array(route)
        from_indices = route_array[:-1]
        to_indices = route_array[1:]
        
        # Vectorized distance calculation
        costs = distance_matrix[from_indices, to_indices]
        return np.sum(costs)
    
    def _calculate_solution_cost(self, solution: List[List[int]], 
                               distance_matrix: np.ndarray) -> float:
        """Calculate total cost of a complete solution using vectorized operations"""
        return sum(self._calculate_route_cost(route, distance_matrix) for route in solution)
    
    def _is_valid_solution(self, solution: List[List[int]], num_locations: int, 
                          depot_index: int = 0) -> bool:
        """Check if solution visits all customers exactly once using set operations"""
        visited_customers = set()
        
        for route in solution:
            for loc in route:
                if loc != depot_index:
                    if loc in visited_customers:
                        return False  # Duplicate visit
                    visited_customers.add(loc)
        
        # Check if all customers (except depot) are visited
        all_customers = set(range(num_locations)) - {depot_index}
        return visited_customers == all_customers

class NearestNeighborSolver(ClassicalSolver):
    """Simple greedy nearest neighbor heuristic with optimizations"""
    
    def __init__(self):
        super().__init__("Nearest Neighbor")
    
    def solve(self, distance_matrix: np.ndarray, num_vehicles: int, 
              depot_index: int = 0) -> Dict[str, Any]:
        """Solve VRP using nearest neighbor heuristic with vectorized operations"""
        
        start_time = time.time()
        num_locations = len(distance_matrix)
        customers = list(range(num_locations))
        customers.remove(depot_index)
        
        solution = []
        remaining_customers = np.array(customers)
        
        for vehicle in range(num_vehicles):
            if len(remaining_customers) == 0:
                break
                
            route = [depot_index]
            current_location = depot_index
            
            # Calculate how many customers this vehicle should serve
            customers_for_this_route = max(1, len(remaining_customers) // (num_vehicles - vehicle))
            
            for _ in range(min(customers_for_this_route, len(remaining_customers))):
                if len(remaining_customers) == 0:
                    break
                
                # Vectorized nearest neighbor search
                distances_to_remaining = distance_matrix[current_location, remaining_customers]
                nearest_idx = np.argmin(distances_to_remaining)
                nearest_customer = remaining_customers[nearest_idx]
                
                route.append(nearest_customer)
                current_location = nearest_customer
                
                # Remove the visited customer efficiently
                remaining_customers = np.delete(remaining_customers, nearest_idx)
            
            # Return to depot
            route.append(depot_index)
            solution.append(route)
        
        # Handle remaining customers if any
        while len(remaining_customers) > 0:
            route = [depot_index]
            current_location = depot_index
            
            for _ in range(min(len(remaining_customers), 3)):  # Limit route length
                if len(remaining_customers) == 0:
                    break
                
                distances_to_remaining = distance_matrix[current_location, remaining_customers]
                nearest_idx = np.argmin(distances_to_remaining)
                nearest_customer = remaining_customers[nearest_idx]
                
                route.append(nearest_customer)
                current_location = nearest_customer
                remaining_customers = np.delete(remaining_customers, nearest_idx)
            
            route.append(depot_index)
            solution.append(route)
        
        execution_time = time.time() - start_time
        
        return {
            "solution": solution,
            "total_cost": self._calculate_solution_cost(solution, distance_matrix),
            "execution_time": execution_time,
            "algorithm": self.name,
            "iterations": 1,
            "num_routes": len(solution),
            "valid": self._is_valid_solution(solution, num_locations, depot_index)
        }

class GeneticAlgorithmSolver(ClassicalSolver):
    """Genetic Algorithm for VRP optimization"""
    
    def __init__(self, population_size: int = 50, generations: int = 100, 
                 mutation_rate: float = 0.1, elite_size: int = 20):
        super().__init__("Genetic Algorithm")
        self.population_size = population_size
        self.generations = generations
        self.mutation_rate = mutation_rate
        self.elite_size = elite_size
    
    def _create_individual(self, customers: List[int], num_vehicles: int) -> List[List[int]]:
        """Create a random individual (solution)"""
        random.shuffle(customers)
        
        # Divide customers among vehicles
        solution = []
        customers_per_vehicle = len(customers) // num_vehicles
        remainder = len(customers) % num_vehicles
        
        start_idx = 0
        for i in range(num_vehicles):
            extra = 1 if i < remainder else 0
            end_idx = start_idx + customers_per_vehicle + extra
            
            if start_idx < len(customers):
                vehicle_customers = customers[start_idx:end_idx]
                if vehicle_customers:  # Only add non-empty routes
                    route = [0] + vehicle_customers + [0]  # Assuming depot is 0
                    solution.append(route)
                start_idx = end_idx
        
        return solution
    
    def _fitness(self, individual: List[List[int]], distance_matrix: np.ndarray) -> float:
        """Calculate fitness (inverse of cost)"""
        cost = self._calculate_solution_cost(individual, distance_matrix)
        return 1 / (1 + cost)  # Higher fitness = better solution
    
    def _selection(self, population: List[List[List[int]]], fitnesses: List[float], 
                   k: int = 3) -> List[List[int]]:
        """Tournament selection"""
        tournament_indices = random.sample(range(len(population)), k)
        tournament_fitnesses = [fitnesses[i] for i in tournament_indices]
        winner_idx = tournament_indices[np.argmax(tournament_fitnesses)]
        return population[winner_idx]
    
    def _crossover(self, parent1: List[List[int]], parent2: List[List[int]]) -> List[List[int]]:
        """Order crossover for VRP"""
        # Extract all customers from both parents
        customers1 = []
        customers2 = []
        
        for route in parent1:
            customers1.extend([c for c in route if c != 0])  # Exclude depot
        for route in parent2:
            customers2.extend([c for c in route if c != 0])
        
        if not customers1 or not customers2:
            return deepcopy(parent1)
        
        # Perform order crossover
        size = min(len(customers1), len(customers2))
        start, end = sorted(random.sample(range(size), 2))
        
        child_customers = [None] * size
        child_customers[start:end] = customers1[start:end]
        
        remaining = [c for c in customers2 if c not in child_customers[start:end]]
        
        j = 0
        for i in range(size):
            if child_customers[i] is None:
                if j < len(remaining):
                    child_customers[i] = remaining[j]
                    j += 1
        
        # Rebuild routes
        num_vehicles = len(parent1)
        return self._create_individual([c for c in child_customers if c is not None], num_vehicles)
    
    def _mutate(self, individual: List[List[int]]) -> List[List[int]]:
        """Swap mutation"""
        if random.random() > self.mutation_rate:
            return individual
        
        # Extract all customers
        customers = []
        for route in individual:
            customers.extend([c for c in route if c != 0])
        
        if len(customers) < 2:
            return individual
        
        # Swap two random customers
        i, j = random.sample(range(len(customers)), 2)
        customers[i], customers[j] = customers[j], customers[i]
        
        # Rebuild routes
        num_vehicles = len(individual)
        return self._create_individual(customers, num_vehicles)
    
    def solve(self, distance_matrix: np.ndarray, num_vehicles: int, 
              depot_index: int = 0) -> Dict[str, Any]:
        """Solve VRP using Genetic Algorithm"""
        
        start_time = time.time()
        num_locations = len(distance_matrix)
        customers = [i for i in range(num_locations) if i != depot_index]
        
        # Initialize population
        population = []
        for _ in range(self.population_size):
            individual = self._create_individual(customers.copy(), num_vehicles)
            population.append(individual)
        
        best_solution = None
        best_cost = float('inf')
        
        for generation in range(self.generations):
            # Evaluate fitness
            fitnesses = [self._fitness(ind, distance_matrix) for ind in population]
            
            # Track best solution
            costs = [self._calculate_solution_cost(ind, distance_matrix) for ind in population]
            gen_best_idx = np.argmin(costs)
            if costs[gen_best_idx] < best_cost:
                best_cost = costs[gen_best_idx]
                best_solution = deepcopy(population[gen_best_idx])
            
            # Selection and reproduction
            new_population = []
            
            # Elitism: keep best individuals
            elite_indices = np.argsort(fitnesses)[-self.elite_size:]
            for idx in elite_indices:
                new_population.append(deepcopy(population[idx]))
            
            # Generate offspring
            while len(new_population) < self.population_size:
                parent1 = self._selection(population, fitnesses)
                parent2 = self._selection(population, fitnesses)
                
                child = self._crossover(parent1, parent2)
                child = self._mutate(child)
                
                new_population.append(child)
            
            population = new_population[:self.population_size]
        
        self.execution_time = time.time() - start_time
        self.iterations = self.generations
        
        return {
            'solution': best_solution if best_solution else population[0],
            'total_cost': best_cost if best_cost != float('inf') else 
                         self._calculate_solution_cost(population[0], distance_matrix),
            'execution_time': self.execution_time,
            'algorithm': self.name,
            'generations': self.generations,
            'is_valid': self._is_valid_solution(best_solution if best_solution else population[0], 
                                              num_locations, depot_index)
        }

class SimulatedAnnealingSolver(ClassicalSolver):
    """Simulated Annealing for VRP optimization"""
    
    def __init__(self, initial_temp: float = 1000.0, final_temp: float = 1.0, 
                 cooling_rate: float = 0.95, max_iterations: int = 1000):
        super().__init__("Simulated Annealing")
        self.initial_temp = initial_temp
        self.final_temp = final_temp
        self.cooling_rate = cooling_rate
        self.max_iterations = max_iterations
    
    def _generate_neighbor(self, solution: List[List[int]]) -> List[List[int]]:
        """Generate a neighbor solution using various move operators"""
        new_solution = deepcopy(solution)
        
        # Extract all customers
        customers = []
        route_assignments = {}
        
        for route_idx, route in enumerate(solution):
            for customer in route:
                if customer != 0:  # Exclude depot
                    customers.append(customer)
                    route_assignments[customer] = route_idx
        
        if len(customers) < 2:
            return new_solution
        
        # Choose a random move operator
        move_type = random.choice(['swap', 'relocate', 'two_opt'])
        
        if move_type == 'swap':
            # Swap two customers
            c1, c2 = random.sample(customers, 2)
            route_assignments[c1], route_assignments[c2] = route_assignments[c2], route_assignments[c1]
            
        elif move_type == 'relocate':
            # Move a customer to a different route
            customer = random.choice(customers)
            new_route = random.randint(0, len(solution) - 1)
            route_assignments[customer] = new_route
            
        elif move_type == 'two_opt':
            # 2-opt within a route
            if len(solution) > 0:
                route_idx = random.randint(0, len(solution) - 1)
                route = solution[route_idx]
                if len(route) > 4:  # Need at least depot-customer1-customer2-depot
                    i, j = sorted(random.sample(range(1, len(route) - 1), 2))
                    route[i:j+1] = reversed(route[i:j+1])
                    return new_solution
        
        # Rebuild solution based on new assignments
        new_solution = [[] for _ in range(len(solution))]
        for customer, route_idx in route_assignments.items():
            new_solution[route_idx].append(customer)
        
        # Add depot at beginning and end of each route
        for route_idx in range(len(new_solution)):
            if new_solution[route_idx]:  # Only if route has customers
                new_solution[route_idx] = [0] + new_solution[route_idx] + [0]
        
        # Remove empty routes
        new_solution = [route for route in new_solution if len(route) > 2]
        
        return new_solution
    
    def solve(self, distance_matrix: np.ndarray, num_vehicles: int, 
              depot_index: int = 0) -> Dict[str, Any]:
        """Solve VRP using Simulated Annealing"""
        
        start_time = time.time()
        num_locations = len(distance_matrix)
        
        # Generate initial solution using nearest neighbor
        nn_solver = NearestNeighborSolver()
        initial_result = nn_solver.solve(distance_matrix, num_vehicles, depot_index)
        current_solution = initial_result['solution']
        current_cost = initial_result['total_cost']
        
        best_solution = deepcopy(current_solution)
        best_cost = current_cost
        
        temperature = self.initial_temp
        iteration = 0
        
        while temperature > self.final_temp and iteration < self.max_iterations:
            # Generate neighbor solution
            neighbor_solution = self._generate_neighbor(current_solution)
            
            # Skip invalid neighbors
            if not self._is_valid_solution(neighbor_solution, num_locations, depot_index):
                iteration += 1
                continue
                
            neighbor_cost = self._calculate_solution_cost(neighbor_solution, distance_matrix)
            
            # Accept or reject the neighbor
            cost_diff = neighbor_cost - current_cost
            
            if cost_diff < 0 or random.random() < math.exp(-cost_diff / temperature):
                current_solution = neighbor_solution
                current_cost = neighbor_cost
                
                # Update best solution
                if current_cost < best_cost:
                    best_solution = deepcopy(current_solution)
                    best_cost = current_cost
            
            # Cool down
            temperature *= self.cooling_rate
            iteration += 1
        
        self.execution_time = time.time() - start_time
        self.iterations = iteration
        
        return {
            'solution': best_solution,
            'total_cost': best_cost,
            'execution_time': self.execution_time,
            'algorithm': self.name,
            'iterations': self.iterations,
            'final_temperature': temperature,
            'is_valid': self._is_valid_solution(best_solution, num_locations, depot_index)
        }

class BranchAndBoundSolver(ClassicalSolver):
    """Simple Branch and Bound solver (for small instances)"""
    
    def __init__(self, max_time: float = 30.0):
        super().__init__("Branch and Bound")
        self.max_time = max_time
        self.best_cost = float('inf')
        self.best_solution = None
    
    def _tsp_bound(self, remaining_customers: List[int], current_location: int, 
                   distance_matrix: np.ndarray) -> float:
        """Calculate lower bound using minimum spanning tree heuristic"""
        if not remaining_customers:
            return distance_matrix[current_location][0]  # Return to depot
        
        # Add current location to the set
        all_locations = [current_location] + remaining_customers + [0]  # Include depot
        
        # Simple MST lower bound
        min_edges = []
        for loc in all_locations:
            min_dist = float('inf')
            for other in all_locations:
                if loc != other:
                    min_dist = min(min_dist, distance_matrix[loc][other])
            min_edges.append(min_dist)
        
        return sum(min_edges) / 2  # Rough MST approximation
    
    def _branch_and_bound(self, distance_matrix: np.ndarray, num_vehicles: int,
                         depot_index: int, start_time: float) -> None:
        """Recursive branch and bound search"""
        
        if time.time() - start_time > self.max_time:
            return
        
        num_locations = len(distance_matrix)
        customers = [i for i in range(num_locations) if i != depot_index]
        
        # For simplicity, we'll only handle small instances optimally
        if len(customers) > 6:  # Too large for exact solution
            # Fall back to nearest neighbor
            nn_solver = NearestNeighborSolver()
            result = nn_solver.solve(distance_matrix, num_vehicles, depot_index)
            self.best_solution = result['solution']
            self.best_cost = result['total_cost']
            return
        
        # For very small instances, try all permutations
        best_cost = float('inf')
        best_solution = None
        
        # Try all ways to assign customers to vehicles
        from itertools import permutations
        
        for perm in permutations(customers):
            # Try different ways to split customers among vehicles
            for split_points in self._generate_splits(len(customers), num_vehicles):
                solution = []
                current_cost = 0
                
                start_idx = 0
                for split in split_points:
                    if start_idx < len(perm):
                        route_customers = list(perm[start_idx:start_idx + split])
                        if route_customers:
                            route = [depot_index] + route_customers + [depot_index]
                            route_cost = self._calculate_route_cost(route, distance_matrix)
                            current_cost += route_cost
                            solution.append(route)
                        start_idx += split
                
                if current_cost < best_cost:
                    best_cost = current_cost
                    best_solution = solution
                
                # Time limit check
                if time.time() - start_time > self.max_time:
                    break
            
            if time.time() - start_time > self.max_time:
                break
        
        self.best_cost = best_cost
        self.best_solution = best_solution
    
    def _generate_splits(self, total_customers: int, num_vehicles: int) -> List[List[int]]:
        """Generate different ways to split customers among vehicles"""
        if num_vehicles == 1:
            return [[total_customers]]
        
        splits = []
        for i in range(1, total_customers):
            for sub_split in self._generate_splits(total_customers - i, num_vehicles - 1):
                splits.append([i] + sub_split)
        
        return splits
    
    def solve(self, distance_matrix: np.ndarray, num_vehicles: int, 
              depot_index: int = 0) -> Dict[str, Any]:
        """Solve VRP using Branch and Bound"""
        
        start_time = time.time()
        
        self.best_cost = float('inf')
        self.best_solution = None
        
        self._branch_and_bound(distance_matrix, num_vehicles, depot_index, start_time)
        
        self.execution_time = time.time() - start_time
        
        # If no solution found, use nearest neighbor as fallback
        if self.best_solution is None:
            nn_solver = NearestNeighborSolver()
            result = nn_solver.solve(distance_matrix, num_vehicles, depot_index)
            self.best_solution = result['solution']
            self.best_cost = result['total_cost']
        
        return {
            'solution': self.best_solution,
            'total_cost': self.best_cost,
            'execution_time': self.execution_time,
            'algorithm': self.name,
            'is_optimal': len(distance_matrix) <= 7,  # Only optimal for very small instances
            'is_valid': self._is_valid_solution(self.best_solution, len(distance_matrix), depot_index)
        }

# Factory functions
def create_classical_solver(algorithm: str, **kwargs) -> ClassicalSolver:
    """Factory function to create classical solvers"""
    
    algorithm = algorithm.lower().replace(' ', '_').replace('-', '_')
    
    if algorithm in ['nearest_neighbor', 'nn', 'greedy']:
        return NearestNeighborSolver()
    elif algorithm in ['genetic_algorithm', 'ga', 'genetic']:
        return GeneticAlgorithmSolver(**kwargs)
    elif algorithm in ['simulated_annealing', 'sa', 'annealing']:
        return SimulatedAnnealingSolver(**kwargs)
    elif algorithm in ['branch_and_bound', 'bb', 'bnb', 'exact']:
        return BranchAndBoundSolver(**kwargs)
    else:
        raise ValueError(f"Unknown classical algorithm: {algorithm}")

def get_available_classical_algorithms() -> List[str]:
    """Get list of available classical algorithm names"""
    return [
        'nearest_neighbor',
        'genetic_algorithm', 
        'simulated_annealing',
        'branch_and_bound'
    ]

def solve_vrp_classical(distance_matrix: np.ndarray, num_vehicles: int,
                       algorithm: str = 'genetic_algorithm', 
                       depot_index: int = 0, **kwargs) -> Dict[str, Any]:
    """
    Solve VRP using the specified classical algorithm
    
    Args:
        distance_matrix: Distance matrix between locations
        num_vehicles: Number of vehicles
        algorithm: Algorithm name
        depot_index: Index of depot location
        **kwargs: Algorithm-specific parameters
    
    Returns:
        Dictionary with solution and metrics
    """
    
    solver = create_classical_solver(algorithm, **kwargs)
    result = solver.solve(distance_matrix, num_vehicles, depot_index)
    
    return result

def compare_classical_algorithms(distance_matrix: np.ndarray, num_vehicles: int,
                               algorithms: List[str] = None,
                               depot_index: int = 0) -> Dict[str, Any]:
    """Compare multiple classical algorithms on the same problem"""
    
    if algorithms is None:
        algorithms = ['nearest_neighbor', 'genetic_algorithm', 'simulated_annealing']
    
    results = {}
    
    for algorithm in algorithms:
        print(f"Running {algorithm}...")
        
        try:
            result = solve_vrp_classical(
                distance_matrix, num_vehicles, algorithm, depot_index,
                generations=50,  # For GA
                max_iterations=200  # For SA
            )
            
            results[algorithm] = result
            print(f"{algorithm}: Cost = {result['total_cost']:.2f}, "
                  f"Time = {result['execution_time']:.2f}s")
            
        except Exception as e:
            print(f"{algorithm} failed: {e}")
            results[algorithm] = {'error': str(e), 'success': False}
    
    # Find best result
    successful_results = {k: v for k, v in results.items() 
                         if 'error' not in v and v.get('is_valid', True)}
    
    if successful_results:
        best_algorithm = min(successful_results.keys(), 
                           key=lambda k: successful_results[k]['total_cost'])
        results['summary'] = {
            'best_algorithm': best_algorithm,
            'best_cost': successful_results[best_algorithm]['total_cost'],
            'algorithms_tested': len(algorithms),
            'successful_algorithms': len(successful_results)
        }
    
    return results

if __name__ == "__main__":
    # Test with a simple example
    np.random.seed(42)
    
    # Create a simple test case
    locations = [(0, 0), (2, 3), (5, 1), (3, 4), (1, 2)]
    num_locations = len(locations)
    
    # Calculate distance matrix
    distance_matrix = np.zeros((num_locations, num_locations))
    for i in range(num_locations):
        for j in range(num_locations):
            if i != j:
                x1, y1 = locations[i]
                x2, y2 = locations[j]
                distance_matrix[i][j] = np.sqrt((x2-x1)**2 + (y2-y1)**2)
    
    print("Testing Classical VRP Solvers")
    print(f"Problem: {num_locations} locations, 2 vehicles")
    print(f"Locations: {locations}")
    
    # Test individual algorithms
    algorithms = ['nearest_neighbor', 'genetic_algorithm', 'simulated_annealing']
    results = compare_classical_algorithms(distance_matrix, 2, algorithms)
    
    print(f"\nResults Summary:")
    if 'summary' in results:
        print(f"Best algorithm: {results['summary']['best_algorithm']}")
        print(f"Best cost: {results['summary']['best_cost']:.2f}")
    
    print(f"\nDetailed Results:")
    for alg, result in results.items():
        if alg != 'summary' and 'error' not in result:
            print(f"{alg}: {result['solution']}")