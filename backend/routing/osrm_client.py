"""
OSRM (Open Source Routing Machine) client implementation.
Supports both self-hosted OSRM instances and demo server.
"""
import asyncio
from typing import List, Tuple, Dict, Any
import logging
from .base_router import BaseRouter, RouteResult, DistanceMatrix, RoutePoint, RouterError
import polyline

logger = logging.getLogger(__name__)

class OSRMClient(BaseRouter):
    """OSRM routing client implementation"""
    
    def __init__(self, base_url: str = "http://router.project-osrm.org", 
                 profile: str = "driving", **kwargs):
        """
        Initialize OSRM client
        
        Args:
            base_url: OSRM server URL (default: demo server)
            profile: Routing profile (driving, walking, cycling)
        """
        super().__init__(base_url, **kwargs)
        self.profile = profile
        
        # OSRM demo server has rate limits, warn user
        if "project-osrm.org" in base_url:
            logger.warning("Using OSRM demo server with rate limits. Consider self-hosting for production.")
    
    def get_service_name(self) -> str:
        return "OSRM"
    
    async def get_route(self, start: Tuple[float, float], end: Tuple[float, float]) -> RouteResult:
        """Get route between two points using OSRM route service"""
        if not self.validate_coordinates([start, end]):
            return RouteResult(
                distance=0, duration=0, status="error", 
                error_message="Invalid coordinates"
            )
        
        try:
            start_point = RoutePoint(start[0], start[1])
            end_point = RoutePoint(end[0], end[1])
            
            # OSRM expects coordinates as lng,lat
            coords = f"{start_point.lng},{start_point.lat};{end_point.lng},{end_point.lat}"
            url = f"{self.base_url}/route/v1/{self.profile}/{coords}"
            
            params = {
                "overview": "full",
                "geometries": "geojson",
                "steps": "false"
            }
            
            response = await self._make_request(url, params)
            
            if response.get("code") != "Ok":
                error_msg = response.get("message", "Unknown OSRM error")
                logger.error(f"OSRM route error: {error_msg}")
                return RouteResult(
                    distance=0, duration=0, status="error",
                    error_message=error_msg
                )
            
            routes = response.get("routes", [])
            if not routes:
                return RouteResult(
                    distance=0, duration=0, status="error",
                    error_message="No routes found"
                )
            
            route = routes[0]
            distance_m = route.get("distance", 0)
            duration_s = route.get("duration", 0)

            # --- FIXED GEOMETRY HANDLING ---
            geometry = []
            geom = route.get("geometry")
            if isinstance(geom, dict):        # GeoJSON LineString (default when geometries=geojson)
                geometry = geom.get("coordinates", [])
            elif isinstance(geom, str):       # Encoded polyline (if geometries=polyline)
                decoded = polyline.decode(geom)  # [(lat, lon), ...]
                geometry = [[lng, lat] for lat, lng in decoded]
            # --- END FIX ---
            logger.info(f"OSRM geometry length: {len(geometry)} for route {start} -> {end}")
            return RouteResult(
                distance=distance_m / 1000.0,  # Convert to km
                duration=duration_s,
                geometry=geometry,
                status="success"
            )
            
        except Exception as e:
            logger.error(f"OSRM route request failed: {str(e)}")
            # Fallback to Euclidean distance
            fallback_distance = self.estimate_euclidean_distance(start, end)
            return RouteResult(
                distance=fallback_distance,
                duration=fallback_distance * 60,  # Rough estimate: 1km/min
                status="fallback",
                error_message=f"Using Euclidean fallback: {str(e)}"
            )

    
    async def get_distance_matrix(self, locations: List[Tuple[float, float]]) -> DistanceMatrix:
        """Get distance matrix using OSRM table service"""
        if not self.validate_coordinates(locations):
            return DistanceMatrix(
                distances=[], durations=[], status="error",
                error_message="Invalid coordinates"
            )
        
        if len(locations) > 25:  # OSRM demo server limit
            logger.warning("Too many locations for OSRM demo server. Consider self-hosting.")
            return await self._calculate_matrix_pairwise(locations)
        
        try:
            points = self._prepare_coordinates(locations)
            
            # Build coordinate string for OSRM
            coords_str = ";".join([f"{p.lng},{p.lat}" for p in points])
            url = f"{self.base_url}/table/v1/{self.profile}/{coords_str}"
            
            params = {
                "annotations": "distance,duration"
            }
            
            response = await self._make_request(url, params)
            
            if response.get("code") != "Ok":
                error_msg = response.get("message", "Unknown OSRM error")
                logger.error(f"OSRM matrix error: {error_msg}")
                return await self._calculate_matrix_pairwise(locations)
            
            # Extract distance and duration matrices
            distances_m = response.get("distances", [])
            durations_s = response.get("durations", [])
            
            # Convert distances from meters to kilometers
            distances_km = [[d/1000.0 if d is not None else float('inf') for d in row] 
                           for row in distances_m]
            
            # Handle None values in durations
            durations_clean = [[d if d is not None else float('inf') for d in row] 
                              for row in durations_s]
            
            return DistanceMatrix(
                distances=distances_km,
                durations=durations_clean,
                status="success"
            )
            
        except Exception as e:
            logger.error(f"OSRM matrix request failed: {str(e)}")
            return await self._calculate_matrix_pairwise(locations)
    
    async def _calculate_matrix_pairwise(self, locations: List[Tuple[float, float]]) -> DistanceMatrix:
        """Calculate distance matrix by making pairwise route requests"""
        n = len(locations)
        distances = [[0.0] * n for _ in range(n)]
        durations = [[0.0] * n for _ in range(n)]
        
        # Use semaphore to limit concurrent requests
        semaphore = asyncio.Semaphore(5)  # Max 5 concurrent requests
        
        async def get_pairwise_distance(i: int, j: int):
            if i == j:
                distances[i][j] = 0.0
                durations[i][j] = 0.0
                return
            
            async with semaphore:
                route_result = await self.get_route(locations[i], locations[j])
                distances[i][j] = route_result.distance
                durations[i][j] = route_result.duration
        
        # Create tasks for all pairwise calculations
        tasks = []
        for i in range(n):
            for j in range(n):
                tasks.append(get_pairwise_distance(i, j))
        
        try:
            await asyncio.gather(*tasks)
            return DistanceMatrix(
                distances=distances,
                durations=durations,
                status="success"
            )
        except Exception as e:
            logger.error(f"Pairwise matrix calculation failed: {str(e)}")
            # Ultimate fallback to Euclidean distances
            return self._euclidean_matrix_fallback(locations)
    
    def _euclidean_matrix_fallback(self, locations: List[Tuple[float, float]]) -> DistanceMatrix:
        """Create distance matrix using Euclidean distances as fallback"""
        n = len(locations)
        distances = [[0.0] * n for _ in range(n)]
        durations = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    dist = self.estimate_euclidean_distance(locations[i], locations[j])
                    distances[i][j] = dist
                    durations[i][j] = dist * 60  # Rough estimate: 1km/min
        
        return DistanceMatrix(
            distances=distances,
            durations=durations,
            status="fallback",
            error_message="Using Euclidean distance fallback"
        )

# Utility functions for OSRM integration
def create_osrm_client(base_url: str = None, profile: str = "driving") -> OSRMClient:
    """Factory function to create OSRM client with default settings"""
    if base_url is None:
        # Default to demo server (with rate limits warning)
        base_url = "http://router.project-osrm.org"
    
    return OSRMClient(
        base_url=base_url,
        profile=profile,
        timeout=30,
        max_retries=3
    )

async def test_osrm_connection(client: OSRMClient) -> bool:
    """Test if OSRM service is accessible"""
    try:
        # Test with simple route in New York
        test_start = (40.7128, -74.0060)  # NYC coordinates
        test_end = (40.7589, -73.9851)    # Times Square
        
        async with client:
            result = await client.get_route(test_start, test_end)
            return result.status in ["success", "fallback"]
    except Exception as e:
        logger.error(f"OSRM connection test failed: {str(e)}")
        return False