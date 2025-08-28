"""
Road-based distance calculator using routing services (OSRM, OpenRouteService).
Provides realistic vehicle routing distances and times.
"""
import asyncio
from typing import List, Tuple, Optional, Dict, Any
import logging
from routing.osrm_client import OSRMClient
from routing.routing_cache import get_cache_instance


logger = logging.getLogger(__name__)

class RoadDistanceCalculator:
    """Road-based distance calculator using routing services"""
    
    def __init__(self, service: str = "osrm", base_url: Optional[str] = None, 
                 profile: str = "driving", use_cache: bool = True):
        """
        Initialize road distance calculator
        
        Args:
            service: Routing service ("osrm", "openroute", "graphhopper")
            base_url: Custom base URL for routing service
            profile: Routing profile (driving, walking, cycling)
            use_cache: Whether to use caching for API responses
        """
        self.service = service
        self.profile = profile
        self.use_cache = use_cache
        self.router = None
        
        # Initialize cache if enabled
        if use_cache:
            self.cache = get_cache_instance()
        else:
            self.cache = None
        
        # Service-specific URLs
        if base_url is None:
            if service == "osrm":
                base_url = "http://router.project-osrm.org"
            elif service == "openroute":
                base_url = "https://api.openrouteservice.org"
            else:
                raise ValueError(f"Unknown routing service: {service}")
        
        self.base_url = base_url
    
    async def initialize(self):
        """Initialize the routing client"""
        if self.service == "osrm":
            self.router = OSRMClient(
                base_url=self.base_url,
                profile=self.profile,
                timeout=30,
                max_retries=2
            )
        else:
            raise ValueError(f"Service {self.service} not yet implemented")
        
        logger.info(f"Initialized {self.service} road distance calculator")
    
    async def calculate_distance(self, start: Tuple[float, float], 
                               end: Tuple[float, float]) -> float:
        """
        Calculate road distance between two points
        
        Args:
            start: (latitude, longitude) of start point
            end: (latitude, longitude) of end point
            
        Returns:
            Road distance in kilometers
        """
        if start == end:
            return {"distance": 0.0, "geometry": []}
        
        # Check cache first
        # Check cache first (return the canonical dict structure)
        if self.cache:
            cached_result = self.cache.get_route(start, end, self.service, self.profile)
            if cached_result:
                # cached_result is a RouteResult; normalize to dict
                return {
                    "distance": cached_result.distance,
                    "geometry": cached_result.geometry,
                    "duration": getattr(cached_result, "duration", None),
                    "status": getattr(cached_result, "status", None)
                }

        
        # Make routing request
        if not self.router:
            raise RuntimeError("Router not initialized. Call initialize() first.")
        
        try:
            async with self.router:
                result = await self.router.get_route(start, end)

                if self.cache:
                    self.cache.set_route(start, end, self.service, result, self.profile)

                return {
                    "distance": result.distance,
                    "geometry": result.geometry
                }
                
        except Exception as e:
            from .euclidean_calc import EuclideanCalculator
            euclidean_calc = EuclideanCalculator()
            euclidean_dist = euclidean_calc.calculate_distance(start, end)
            return {
                "distance": euclidean_dist * 1.3,
                "geometry": None  # no geometry in fallback
            }

    
    async def calculate_distance_matrix(self, locations: List[Tuple[float, float]]) -> List[List[float]]:
        """
        Calculate road distance matrix for multiple locations
        Args:
            locations: List of (latitude, longitude) tuples
        Returns: 2D list representing road distance matrix in kilometers
        """
        # Check cache first
        if self.cache:
            cached_result = self.cache.get_matrix(locations, self.service, self.profile)
            if cached_result:
                return cached_result.distances
        
        if not self.router:
            raise RuntimeError("Router not initialized. Call initialize() first.")
        
        try:
            async with self.router:
                result = await self.router.get_distance_matrix(locations)
                
                # Cache the result
                if self.cache:
                    self.cache.set_matrix(locations, self.service, result, self.profile)
                
                return result.distances
                
        except Exception as e:
            logger.error(f"Road distance matrix calculation failed: {str(e)}")
            # Fallback to pairwise calculations
            return await self._calculate_matrix_pairwise(locations)
    
    async def _calculate_matrix_pairwise(self, locations: List[Tuple[float, float]]) -> List[List[float]]:
        n = len(locations)
        matrix = [[0.0] * n for _ in range(n)]

        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(3)

        async def calculate_distance_pair(i: int, j: int):
            if i == j:
                matrix[i][j] = 0.0
                return

            async with semaphore:
                # ✅ Use our own method (handles cache + OSRM + fallback)
                res = await self.calculate_distance(locations[i], locations[j])

                # normalize result
                if isinstance(res, dict):
                    matrix[i][j] = res.get("distance", float("inf"))
                else:
                    matrix[i][j] = getattr(res, "distance", float("inf"))

        # Create tasks for all pairs
        tasks = [calculate_distance_pair(i, j) for i in range(n) for j in range(n)]
        try:
            await asyncio.gather(*tasks)
            return matrix
        except Exception as e:
            logger.error(f"Pairwise road distance calculation failed: {str(e)}")
            from .euclidean_calc import EuclideanCalculator
            euclidean_calc = EuclideanCalculator()
            euclidean_matrix = euclidean_calc.calculate_distance_matrix(locations)
            return [[dist * 1.3 for dist in row] for row in euclidean_matrix]

    async def get_route_geometry(self, start: Tuple[float, float], 
                               end: Tuple[float, float]) -> Optional[List[List[float]]]:
        """Get detailed route geometry for visualization"""
        if not self.router:
            return None
        
        try:
            async with self.router:
                result = await self.router.get_route(start, end)
                return result.geometry
        except Exception as e:
            logger.error(f"Failed to get route geometry: {str(e)}")
            return None
    
    def get_service_info(self) -> Dict[str, Any]:
        """Get information about the current routing service"""
        info = {
            "service": self.service,
            "profile": self.profile,
            "base_url": self.base_url,
            "cache_enabled": self.use_cache,
            "initialized": self.router is not None
        }
        
        if self.cache:
            info["cache_stats"] = self.cache.get_cache_stats()
        
        return info
    
    async def test_service_connection(self) -> bool:
        """Test if the routing service is accessible"""
        if not self.router:
            return False
        
        try:
            # Test with simple coordinates
            test_start = (40.7128, -74.0060)  # NYC
            test_end = (40.7589, -73.9851)    # Times Square
            
            distance = await self.calculate_distance(test_start, test_end)
            return distance > 0
        except Exception as e:
            logger.error(f"Service connection test failed: {str(e)}")
            return False
    
    async def cleanup(self):
        """Cleanup resources"""
        if self.router and hasattr(self.router, 'cleanup'):
            await self.router.cleanup()
        
        if self.cache:
            self.cache.cleanup_expired()

# Factory functions for different routing services
async def create_osrm_calculator(base_url: str = None, profile: str = "driving") -> RoadDistanceCalculator:
    """Create and initialize OSRM road distance calculator"""
    calculator = RoadDistanceCalculator(
        service="osrm",
        base_url=base_url,
        profile=profile
    )
    await calculator.initialize()
    return calculator

# Utility function for quick road distance calculation
async def quick_road_distance(start: Tuple[float, float], end: Tuple[float, float], 
                            service: str = "osrm") -> float:
    """Quick road distance calculation without managing calculator lifecycle"""
    calculator = RoadDistanceCalculator(service=service)
    await calculator.initialize()
    try:
        return await calculator.calculate_distance(start, end)
    finally:
        await calculator.cleanup()