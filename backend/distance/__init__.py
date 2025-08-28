"""
Distance calculation module supporting both Euclidean and road-based routing.
Main interface for VRP solvers to calculate distances between locations.
"""
from .distance_manager import (
    DistanceManager, 
    DistanceMode, 
    get_distance_manager,
    calculate_vrp_distances,
    calculate_vrp_distances_sync
)
from .euclidean_calc import (
    EuclideanCalculator,
    haversine_distance,
    euclidean_distance_matrix,
    simple_euclidean_2d
)
from .road_calc import (
    RoadDistanceCalculator,
    create_osrm_calculator,
    quick_road_distance
)

__all__ = [
    # Main interface
    'DistanceManager',
    'DistanceMode',
    'get_distance_manager',
    'calculate_vrp_distances',
    'calculate_vrp_distances_sync',
    
    # Euclidean calculations
    'EuclideanCalculator',
    'haversine_distance',
    'euclidean_distance_matrix', 
    'simple_euclidean_2d',
    
    # Road calculations
    'RoadDistanceCalculator',
    'create_osrm_calculator',
    'quick_road_distance'
]

# Default distance calculation function for VRP solvers
async def calculate_distances(locations, mode="euclidean"):
    """
    Convenience function for VRP solvers.
    
    Args:
        locations: List of (lat, lng) tuples
        mode: "euclidean", "road_osrm", "road_openroute", or "hybrid"
    
    Returns:
        Distance matrix as 2D list
    """
    distance_mode = DistanceMode(mode)
    return await calculate_vrp_distances(locations, distance_mode)

# Backward compatibility function
def calculate_distances_sync(locations):
    """
    Synchronous distance calculation (Euclidean only).
    For backward compatibility with existing VRP code.
    """
    return calculate_vrp_distances_sync(locations)