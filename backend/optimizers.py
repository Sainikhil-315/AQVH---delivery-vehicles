"""
Advanced quantum optimizers for QAOA parameter optimization.
Supports multiple optimization algorithms with adaptive selection.
"""

import numpy as np
from typing import Dict, List, Tuple, Callable, Any, Optional
from scipy.optimize import minimize, OptimizeResult
import time
from abc import ABC, abstractmethod
from qiskit_algorithms.optimizers import SPSA, COBYLA,ADAM


class QuantumOptimizer(ABC):
    """Base class for quantum parameter optimizers"""
    
    def __init__(self, name: str, maxiter: int = 100):
        self.name = name
        self.maxiter = maxiter
        self.history = []
        self.best_params = None
        self.best_value = float('inf')
        
    @abstractmethod
    def optimize(self, objective_function: Callable, initial_params: np.ndarray, 
                bounds: List[Tuple[float, float]]) -> OptimizeResult:
        """Optimize the objective function"""
        pass
    
    def _callback(self, params: np.ndarray, value: float = None):
        """Callback function to track optimization progress"""
        if value is None:
            # If value not provided, we can't track it
            return
            
        self.history.append({
            'params': params.copy(),
            'value': value,
            'iteration': len(self.history)
        })
        
        if value < self.best_value:
            self.best_value = value
            self.best_params = params.copy()

class SPSAOptimizer(QuantumOptimizer):
    """
    Simultaneous Perturbation Stochastic Approximation (SPSA)
    Excellent for noisy quantum objective functions
    """
    
    def __init__(self, maxiter: int = 100, a: float = 0.602, c: float = 0.101, 
                 A: float = None, alpha: float = 1.0, gamma: float = 0.167):
        super().__init__("SPSA", maxiter)
        self.a = a
        self.c = c
        self.A = A if A is not None else maxiter // 10
        self.alpha = alpha
        self.gamma = gamma
    
    def optimize(self, objective_function: Callable, initial_params: np.ndarray, 
                bounds: List[Tuple[float, float]]) -> OptimizeResult:
        """SPSA optimization implementation"""
        
        params = initial_params.copy()
        n_params = len(params)
        
        # SPSA parameters
        a = self.a
        c = self.c
        A = self.A
        alpha = self.alpha
        gamma = self.gamma
        
        best_params = params.copy()
        best_value = objective_function(params)
        
        for k in range(self.maxiter):
            # SPSA coefficients
            ak = a / (k + 1 + A)**alpha
            ck = c / (k + 1)**gamma
            
            # Random perturbation vector (Bernoulli ±1)
            delta = 2 * np.random.randint(0, 2, n_params) - 1
            
            # Evaluate function at perturbed points
            params_plus = params + ck * delta
            params_minus = params - ck * delta
            
            # Apply bounds
            params_plus = np.clip(params_plus, [b[0] for b in bounds], [b[1] for b in bounds])
            params_minus = np.clip(params_minus, [b[0] for b in bounds], [b[1] for b in bounds])
            
            # Function evaluations
            f_plus = objective_function(params_plus)
            f_minus = objective_function(params_minus)
            
            # SPSA gradient estimate
            gradient = (f_plus - f_minus) / (2 * ck * delta)
            
            # Parameter update
            params = params - ak * gradient
            
            # Apply bounds
            params = np.clip(params, [b[0] for b in bounds], [b[1] for b in bounds])
            
            # Evaluate current point
            current_value = objective_function(params)
            
            # Track best solution
            if current_value < best_value:
                best_value = current_value
                best_params = params.copy()
            
            self._callback(params, current_value)
        
        return OptimizeResult(
            x=best_params,
            fun=best_value,
            nit=self.maxiter,
            success=True,
            message="SPSA optimization completed"
        )

class ADAMOptimizer(QuantumOptimizer):
    """
    ADAM optimizer adapted for quantum parameter optimization
    Good for smooth landscapes with local structure
    """
    
    def __init__(self, maxiter: int = 100, lr: float = 0.01, beta1: float = 0.9, 
                 beta2: float = 0.999, epsilon: float = 1e-8):
        super().__init__("ADAM", maxiter)
        self.lr = lr
        self.beta1 = beta1
        self.beta2 = beta2
        self.epsilon = epsilon
    
    def _finite_difference_gradient(self, objective_function: Callable, 
                                  params: np.ndarray, epsilon: float = 1e-6) -> np.ndarray:
        """Compute gradient using finite differences"""
        gradient = np.zeros_like(params)
        
        for i in range(len(params)):
            params_plus = params.copy()
            params_minus = params.copy()
            
            params_plus[i] += epsilon
            params_minus[i] -= epsilon
            
            f_plus = objective_function(params_plus)
            f_minus = objective_function(params_minus)
            
            gradient[i] = (f_plus - f_minus) / (2 * epsilon)
        
        return gradient
    
    def optimize(self, objective_function: Callable, initial_params: np.ndarray, 
                bounds: List[Tuple[float, float]]) -> OptimizeResult:
        """ADAM optimization implementation"""
        
        params = initial_params.copy()
        
        # ADAM state variables
        m = np.zeros_like(params)  # First moment
        v = np.zeros_like(params)  # Second moment
        
        best_params = params.copy()
        best_value = objective_function(params)
        
        for t in range(1, self.maxiter + 1):
            # Compute gradient
            gradient = self._finite_difference_gradient(objective_function, params)
            
            # Update biased first moment estimate
            m = self.beta1 * m + (1 - self.beta1) * gradient
            
            # Update biased second raw moment estimate
            v = self.beta2 * v + (1 - self.beta2) * (gradient ** 2)
            
            # Compute bias-corrected first moment estimate
            m_hat = m / (1 - self.beta1 ** t)
            
            # Compute bias-corrected second raw moment estimate
            v_hat = v / (1 - self.beta2 ** t)
            
            # Update parameters
            params = params - self.lr * m_hat / (np.sqrt(v_hat) + self.epsilon)
            
            # Apply bounds
            params = np.clip(params, [b[0] for b in bounds], [b[1] for b in bounds])
            
            # Evaluate current point
            current_value = objective_function(params)
            
            # Track best solution
            if current_value < best_value:
                best_value = current_value
                best_params = params.copy()
            
            self._callback(params, current_value)
        
        return OptimizeResult(
            x=best_params,
            fun=best_value,
            nit=self.maxiter,
            success=True,
            message="ADAM optimization completed"
        )

class ScipyOptimizer(QuantumOptimizer):
    """Wrapper for SciPy optimizers"""
    
    def __init__(self, method: str, maxiter: int = 100, **kwargs):
        super().__init__(method, maxiter)
        self.method = method
        self.kwargs = kwargs
    
    def optimize(self, objective_function: Callable, initial_params: np.ndarray, 
                bounds: List[Tuple[float, float]]) -> OptimizeResult:
        """Use SciPy optimization methods"""
        
        def callback_wrapper(params):
            value = objective_function(params)
            self._callback(params, value)
        
        # Different methods have different parameter names for max iterations
        iter_param_map = {
            'COBYLA': 'maxiter',
            'Powell': 'maxiter',
            'L-BFGS-B': 'maxiter',
            'SLSQP': 'maxiter',
            'TNC': 'maxiter'
        }
        
        options = self.kwargs.get('options', {})
        if self.method in iter_param_map:
            options[iter_param_map[self.method]] = self.maxiter
        
        result = minimize(
            objective_function,
            initial_params,
            method=self.method,
            bounds=bounds,
            options=options,
            callback=callback_wrapper,
            **{k: v for k, v in self.kwargs.items() if k != 'options'}
        )
        
        return result

class EnsembleOptimizer(QuantumOptimizer):
    """
    Ensemble optimizer that runs multiple optimizers and selects the best result
    """
    
    def __init__(self, optimizers: List[QuantumOptimizer], selection_strategy: str = "best_value"):
        super().__init__("Ensemble", max([opt.maxiter for opt in optimizers]))
        self.optimizers = optimizers
        self.selection_strategy = selection_strategy
        self.results = {}
    
    def optimize(self, objective_function: Callable, initial_params: np.ndarray, 
                bounds: List[Tuple[float, float]]) -> OptimizeResult:
        """Run all optimizers and select the best result"""
        
        results = []
        
        for optimizer in self.optimizers:
            print(f"Running {optimizer.name} optimizer...")
            start_time = time.time()
            
            try:
                result = optimizer.optimize(objective_function, initial_params, bounds)
                result.execution_time = time.time() - start_time
                result.optimizer_name = optimizer.name
                results.append(result)
                
                self.results[optimizer.name] = {
                    'result': result,
                    'history': optimizer.history.copy()
                }
                
            except Exception as e:
                print(f"Optimizer {optimizer.name} failed: {e}")
                continue
        
        if not results:
            raise RuntimeError("All optimizers failed")
        
        # Select best result based on strategy
        if self.selection_strategy == "best_value":
            best_result = min(results, key=lambda r: r.fun)
        else:
            best_result = results[0]  # Default to first
        
        # Update our history with the best optimizer's history
        best_optimizer_name = best_result.optimizer_name
        self.history = self.results[best_optimizer_name]['history']
        
        best_result.ensemble_results = self.results
        
        return best_result

class AdaptiveOptimizer(QuantumOptimizer):
    """
    Adaptive optimizer that selects the best optimizer based on problem characteristics
    """
    
    def __init__(self, maxiter: int = 100):
        super().__init__("Adaptive", maxiter)
        
        # Initialize available optimizers
        self.optimizers = {
            'SPSA': SPSAOptimizer(maxiter=maxiter),
            'ADAM': ADAMOptimizer(maxiter=maxiter),
            'COBYLA': ScipyOptimizer('COBYLA', maxiter=maxiter),
            'Powell': ScipyOptimizer('Powell', maxiter=maxiter),
            'L-BFGS-B': ScipyOptimizer('L-BFGS-B', maxiter=maxiter)
        }
    
    def _analyze_landscape(self, objective_function: Callable, initial_params: np.ndarray, 
                          bounds: List[Tuple[float, float]]) -> str:
        """Analyze the optimization landscape to select the best optimizer"""
        
        # Simple heuristics for optimizer selection
        n_params = len(initial_params)
        
        # For few parameters, try gradient-based methods
        if n_params <= 4:
            return 'L-BFGS-B'
        
        # For medium number of parameters, SPSA often works well
        elif n_params <= 8:
            return 'SPSA'
        
        # For many parameters, try COBYLA (derivative-free)
        else:
            return 'COBYLA'
    
    def optimize(self, objective_function: Callable, initial_params: np.ndarray, 
                bounds: List[Tuple[float, float]]) -> OptimizeResult:
        """Select and run the most appropriate optimizer"""
        
        selected_optimizer_name = self._analyze_landscape(objective_function, initial_params, bounds)
        selected_optimizer = self.optimizers[selected_optimizer_name]
        
        print(f"Adaptive optimizer selected: {selected_optimizer_name}")
        
        result = selected_optimizer.optimize(objective_function, initial_params, bounds)
        result.selected_optimizer = selected_optimizer_name
        
        # Copy history from selected optimizer
        self.history = selected_optimizer.history.copy()
        
        return result


# Factory functions
def create_optimizer(name: str, **kwargs):
    """Factory function to create optimizers compatible with QAOA"""
    name_upper = name.upper()

    if name_upper == 'SPSA':
        # Use Qiskit SPSA
        return SPSA(maxiter=kwargs.get('maxiter', 100))
    elif name_upper == 'ADAM':
        # Use Qiskit ADAM
        return ADAM(maxiter=kwargs.get('maxiter', 100))
    elif name_upper == 'COBYLA':
        # Use Qiskit COBYLA
        return COBYLA(maxiter=kwargs.get('maxiter', 100))
    elif name_upper == 'ENSEMBLE':
        # Leave your ensemble implementation as-is
        optimizers = [
            SPSAOptimizer(maxiter=kwargs.get('maxiter', 50)),
            ADAMOptimizer(maxiter=kwargs.get('maxiter', 50)),
            ScipyOptimizer('COBYLA', maxiter=kwargs.get('maxiter', 50))
        ]
        return EnsembleOptimizer(optimizers)
    elif name_upper == 'ADAPTIVE':
        return AdaptiveOptimizer(**kwargs)
    elif name_upper in ['POWELL', 'L-BFGS-B', 'SLSQP', 'TNC']:
        return ScipyOptimizer(name_upper, **kwargs)
    else:
        raise ValueError(f"Unknown optimizer: {name}")

def get_available_optimizers() -> List[str]:
    """Get list of available optimizer names"""
    return ['SPSA', 'ADAM', 'COBYLA', 'Powell', 'L-BFGS-B', 'SLSQP', 'Ensemble', 'Adaptive']

def compare_optimizers(objective_function: Callable, initial_params: np.ndarray, 
                      bounds: List[Tuple[float, float]], 
                      optimizer_names: List[str] = None, 
                      maxiter: int = 100) -> Dict[str, Any]:
    """
    Compare multiple optimizers on the same objective function
    
    Returns:
        Dictionary with comparison results
    """
    
    if optimizer_names is None:
        optimizer_names = ['SPSA', 'ADAM', 'COBYLA']
    
    results = {}
    
    for name in optimizer_names:
        print(f"\nRunning {name} optimizer...")
        
        optimizer = create_optimizer(name, maxiter=maxiter)
        start_time = time.time()
        
        try:
            result = optimizer.optimize(objective_function, initial_params, bounds)
            execution_time = time.time() - start_time
            
            results[name] = {
                'success': result.success if hasattr(result, 'success') else True,
                'best_value': result.fun,
                'best_params': result.x.tolist(),
                'execution_time': execution_time,
                'iterations': result.nit if hasattr(result, 'nit') else len(optimizer.history),
                'history': optimizer.history.copy()
            }
            
            print(f"{name} completed: Best value = {result.fun:.6f}, Time = {execution_time:.2f}s")
            
        except Exception as e:
            print(f"{name} failed: {e}")
            results[name] = {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
    
    # Find best overall result
    successful_results = {k: v for k, v in results.items() if v.get('success', False)}
    
    if successful_results:
        best_optimizer = min(successful_results.keys(), 
                           key=lambda k: successful_results[k]['best_value'])
        
        results['summary'] = {
            'best_optimizer': best_optimizer,
            'best_value': successful_results[best_optimizer]['best_value'],
            'total_optimizers': len(optimizer_names),
            'successful_optimizers': len(successful_results)
        }
    else:
        results['summary'] = {
            'best_optimizer': None,
            'best_value': float('inf'),
            'total_optimizers': len(optimizer_names),
            'successful_optimizers': 0
        }
    
    return results

if __name__ == "__main__":
    # Test the optimizers with a simple quadratic function
    def test_objective(params):
        """Simple quadratic test function: f(x,y) = (x-1)^2 + (y-2)^2"""
        x, y = params
        return (x - 1)**2 + (y - 2)**2
    
    # Test parameters
    initial_params = np.array([0.0, 0.0])
    bounds = [(-5.0, 5.0), (-5.0, 5.0)]
    
    print("Testing optimizers on quadratic function f(x,y) = (x-1)^2 + (y-2)^2")
    print("Global minimum at (1, 2) with value 0")
    
    # Test individual optimizers
    optimizer_names = ['SPSA', 'ADAM', 'COBYLA', 'Powell']
    results = compare_optimizers(test_objective, initial_params, bounds, 
                               optimizer_names, maxiter=50)
    
    print(f"\nComparison Summary:")
    print(f"Best optimizer: {results['summary']['best_optimizer']}")
    print(f"Best value: {results['summary']['best_value']:.6f}")
    print(f"Successful optimizers: {results['summary']['successful_optimizers']}/{results['summary']['total_optimizers']}")
    
    # Test ensemble optimizer
    print(f"\nTesting Ensemble optimizer...")
    ensemble = create_optimizer('ENSEMBLE', maxiter=30)
    result = ensemble.optimize(test_objective, initial_params, bounds)
    print(f"Ensemble result: {result.fun:.6f} at {result.x}")
    print(f"Selected optimizers: {list(ensemble.results.keys())}")
    
    # Test adaptive optimizer
    print(f"\nTesting Adaptive optimizer...")
    adaptive = create_optimizer('ADAPTIVE', maxiter=50)
    result = adaptive.optimize(test_objective, initial_params, bounds)
    print(f"Adaptive result: {result.fun:.6f} at {result.x}")
    print(f"Selected optimizer: {result.selected_optimizer}")