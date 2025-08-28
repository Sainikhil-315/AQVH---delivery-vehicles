"""
Main distance calculation interface that supports both Euclidean and road-based routing.
This is the primary interface used by VRP solvers.
"""
import asyncio
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum
import logging
import numpy as np
from .euclidean_calc import EuclideanCalculator
from .road_calc import RoadDistanceCalculator

logger = logging.getLogger(__name__)

class DistanceMode(Enum):
    """Distance calculation modes"""
    EUCLIDEAN = "euclidean"
    ROAD_OSRM = "road_osrm"
    ROAD_OPENROUTE = "road_openroute"
    HYBRID = "hybrid"  # Use road when possible, fallback to euclidean

class DistanceManager:
    """Main distance calculation manager"""
    
    def __init__(self):
        self.euclidean_calc = EuclideanCalculator()
        self.road_calc: Optional[RoadDistanceCalculator] = None
        self.current_mode = DistanceMode.EUCLIDEAN
        self._cache = {}
    
    async def initialize_road_calculator(self, mode: DistanceMode = DistanceMode.ROAD_OSRM,
                                       base_url: Optional[str] = None):
        """Initialize road distance calculator"""
        if mode in [DistanceMode.ROAD_OSRM, DistanceMode.ROAD_OPENROUTE, DistanceMode.HYBRID]:
            service = "osrm" if mode == DistanceMode.ROAD_OSRM else "openroute"
            self.road_calc = RoadDistanceCalculator(service=service, base_url=base_url)
            await self.road_calc.initialize()
    
    def set_mode(self, mode: DistanceMode):
        """Set distance calculation mode"""
        self.current_mode = mode
        logger.info(f"Distance calculation mode set to: {mode.value}")
    
    def get_mode(self) -> DistanceMode:
        """Get current distance calculation mode"""
        return self.current_mode
    
    async def calculate_distance(self, start, end):
        """Calculate distance + geometry between two points based on current mode"""
        if start == end:
            return {"distance": 0.0, "geometry": []}

        try:
            if self.current_mode == DistanceMode.EUCLIDEAN:
                distance = self.euclidean_calc.calculate_distance(start, end)
                return {"distance": distance, "geometry": None}

            elif self.current_mode in [DistanceMode.ROAD_OSRM, DistanceMode.ROAD_OPENROUTE]:
                if self.road_calc is None:
                    logger.warning("Road calculator not initialized. Falling back to Euclidean.")
                    distance = self.euclidean_calc.calculate_distance(start, end)
                    return {"distance": distance, "geometry": None}
                else:
                    # road_calc already returns {distance, geometry}
                    return await self.road_calc.calculate_distance(start, end)

            elif self.current_mode == DistanceMode.HYBRID:
                if self.road_calc is not None:
                    return await self.road_calc.calculate_distance(start, end)
                else:
                    distance = self.euclidean_calc.calculate_distance(start, end)
                    return {"distance": distance, "geometry": None}

            else:
                logger.error(f"Unknown distance mode: {self.current_mode}")
                distance = self.euclidean_calc.calculate_distance(start, end)
                return {"distance": distance, "geometry": None}

        except Exception as e:
            logger.error(f"Distance calculation failed: {str(e)}. Using Euclidean fallback.")
            distance = self.euclidean_calc.calculate_distance(start, end)
            return {"distance": distance, "geometry": None}

    
    async def calculate_distance_matrix(self, locations: List[Tuple[float, float]]) -> List[List[float]]:
        """Calculate distance matrix for multiple locations"""
        n = len(locations)
        
        # Check cache for complete matrix
        cache_key = f"matrix_{hash(tuple(locations))}_{self.current_mode.value}" # optional replacement - cache_key = f"matrix_{tuple((round(lat,6), round(lng,6)) for lat, lng in locations)}_{self.current_mode.value}"

        if cache_key in self._cache:
            return self._cache[cache_key]
        
        try:
            if self.current_mode == DistanceMode.EUCLIDEAN:
                matrix = self.euclidean_calc.calculate_distance_matrix(locations)
            
            elif self.current_mode in [DistanceMode.ROAD_OSRM, DistanceMode.ROAD_OPENROUTE, DistanceMode.HYBRID]:
                if self.road_calc is None:
                    logger.warning("Road calculator not initialized. Falling back to Euclidean.")
                    matrix = self.euclidean_calc.calculate_distance_matrix(locations)
                else:
                    matrix = await self.road_calc.calculate_distance_matrix(locations)
            
            else:
                matrix = self.euclidean_calc.calculate_distance_matrix(locations)
            
            # Cache the result
            self._cache[cache_key] = matrix
            return matrix
            
        except Exception as e:
            logger.error(f"Distance matrix calculation failed: {str(e)}. Using Euclidean fallback.")
            matrix = self.euclidean_calc.calculate_distance_matrix(locations)
            self._cache[cache_key] = matrix
            return matrix
    
    def get_distance_info(self) -> Dict[str, Any]:
        """Get information about current distance calculation setup"""
        info = {
            "mode": self.current_mode.value,
            "euclidean_available": True,
            "road_available": self.road_calc is not None,
            "cache_size": len(self._cache)
        }
        
        if self.road_calc:
            info.update(self.road_calc.get_service_info())
        
        return info
    
    def clear_cache(self):
        """Clear distance calculation cache"""
        self._cache.clear()
        logger.info("Distance calculation cache cleared")
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.road_calc:
            await self.road_calc.cleanup()
        self.clear_cache()

# Global distance manager instance
_distance_manager: Optional[DistanceManager] = None

def get_distance_manager() -> DistanceManager:
    """Get or create global distance manager instance"""
    global _distance_manager
    if _distance_manager is None:
        _distance_manager = DistanceManager()
    return _distance_manager

async def calculate_vrp_distances(locations: List[Tuple[float, float]], 
                                mode: DistanceMode = DistanceMode.EUCLIDEAN) -> List[List[float]]:
    """
    Convenience function for VRP solvers to calculate distance matrices.
    This is the main function that existing VRP code should use.
    """
    manager = get_distance_manager()
    
    # Initialize road calculator if needed
    if mode != DistanceMode.EUCLIDEAN and manager.road_calc is None:
        await manager.initialize_road_calculator(mode)
    
    # Set mode and calculate matrix
    manager.set_mode(mode)
    return await manager.calculate_distance_matrix(locations)

def calculate_vrp_distances_sync(locations: List[Tuple[float, float]]) -> List[List[float]]:
    """
    Synchronous version for backward compatibility with existing VRP solvers.
    Always uses Euclidean distance.
    """
    manager = get_distance_manager()
    manager.set_mode(DistanceMode.EUCLIDEAN)
    return manager.euclidean_calc.calculate_distance_matrix(locations)