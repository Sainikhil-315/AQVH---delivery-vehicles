"""
Euclidean distance calculator using Haversine formula for geographic coordinates.
This maintains your existing straight-line distance calculations.
"""
import math
from typing import List, Tuple
import numpy as np

class EuclideanCalculator:
    """Calculator for straight-line distances between geographic coordinates"""
    
    def __init__(self):
        self.earth_radius_km = 6371.0  # Earth's radius in kilometers
    
    def calculate_distance(self, start: Tuple[float, float], end: Tuple[float, float]) -> float:
        """
        Calculate great circle distance between two points using Haversine formula.
        
        Args:
            start: (latitude, longitude) of start point
            end: (latitude, longitude) of end point
            
        Returns:
            Distance in kilometers
        """
        if start == end:
            return 0.0
        
        lat1, lon1 = start
        lat2, lon2 = end
        
        # Convert latitude and longitude from degrees to radians
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        
        # Haversine formula
        a = (math.sin(dlat / 2) ** 2 +
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        # Distance in kilometers
        distance = self.earth_radius_km * c
        return distance
    
    def calculate_distance_matrix(self, locations: List[Tuple[float, float]]) -> List[List[float]]:
        """
        Calculate distance matrix for multiple locations.
        
        Args:
            locations: List of (latitude, longitude) tuples
            
        Returns:
            2D list representing distance matrix in kilometers
        """
        n = len(locations)
        matrix = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    matrix[i][j] = self.calculate_distance(locations[i], locations[j])
                else:
                    matrix[i][j] = 0.0
        
        return matrix
    
    def calculate_distance_matrix_numpy(self, locations: List[Tuple[float, float]]) -> np.ndarray:
        """
        Vectorized distance matrix calculation using NumPy (faster for large datasets).
        
        Args:
            locations: List of (latitude, longitude) tuples
            
        Returns:
            NumPy array representing distance matrix in kilometers
        """
        locations_array = np.array(locations)
        n = len(locations_array)
        
        # Convert to radians
        coords_rad = np.radians(locations_array)
        
        # Extract latitudes and longitudes
        lats = coords_rad[:, 0]
        lons = coords_rad[:, 1]
        
        # Create meshgrids for vectorized calculation
        lat1, lat2 = np.meshgrid(lats, lats, indexing='ij')
        lon1, lon2 = np.meshgrid(lons, lons, indexing='ij')
        
        # Calculate differences
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        
        # Haversine formula (vectorized)
        a = (np.sin(dlat / 2) ** 2 +
             np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2)
        c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
        
        # Distance matrix in kilometers
        distance_matrix = self.earth_radius_km * c
        
        # Set diagonal to zero (distance from point to itself)
        np.fill_diagonal(distance_matrix, 0.0)
        
        return distance_matrix
    
    def get_calculator_info(self) -> dict:
        """Get information about this calculator"""
        return {
            "type": "euclidean",
            "method": "haversine_formula",
            "earth_radius_km": self.earth_radius_km,
            "description": "Great circle distance between geographic coordinates"
        }

# Utility functions for backward compatibility
def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Simple haversine distance function for backward compatibility.
    
    Args:
        lat1, lon1: First point coordinates
        lat2, lon2: Second point coordinates
        
    Returns:
        Distance in kilometers
    """
    calculator = EuclideanCalculator()
    return calculator.calculate_distance((lat1, lon1), (lat2, lon2))

def euclidean_distance_matrix(locations: List[List[float]]) -> List[List[float]]:
    """
    Calculate Euclidean distance matrix from list of [lat, lng] coordinates.
    For compatibility with existing VRP solver code.
    
    Args:
        locations: List of [latitude, longitude] lists
        
    Returns:
        Distance matrix as 2D list
    """
    # Convert to tuples format
    location_tuples = [(loc[0], loc[1]) for loc in locations]
    
    calculator = EuclideanCalculator()
    return calculator.calculate_distance_matrix(location_tuples)

def simple_euclidean_2d(x1: float, y1: float, x2: float, y2: float) -> float:
    """
    Simple 2D Euclidean distance for Cartesian coordinates.
    Use this for non-geographic coordinate systems.
    
    Args:
        x1, y1: First point coordinates
        x2, y2: Second point coordinates
        
    Returns:
        Euclidean distance
    """
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)