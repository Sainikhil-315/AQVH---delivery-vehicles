"""
OpenRouteService client implementation.
Requires API key for production usage.
"""
import asyncio
from typing import List, Tuple, Dict, Any
import logging
from .base_router import BaseRouter, RouteResult, DistanceMatrix, RoutePoint, RouterError

logger = logging.getLogger(__name__)

class OpenRouteClient(BaseRouter):
    """OpenRouteService routing client implementation"""
    
    def __init__(self, api_key: str, base_url: str = "https://api.openrouteservice.org", 
                 profile: str = "driving-car", **kwargs):
        """
        Initialize OpenRouteService client
        
        Args:
            api_key: ORS API key (required)
            base_url: ORS API base URL
            profile: Routing profile (driving-car, cycling-regular, foot-walking)
        """
        if not api_key:
            raise ValueError("OpenRouteService requires an API key")
        
        super().__init__(base_url, api_key, **kwargs)
        self.profile = profile
        
        # ORS profile mapping
        self.profile_map = {
            "driving": "driving-car",
            "cycling": "cycling-regular", 
            "walking": "foot-walking",
            "driving-car": "driving-car",
            "cycling-regular": "cycling-regular",
            "foot-walking": "foot-walking"
        }
        
        # Use mapped profile
        self.ors_profile = self.profile_map.get(profile, profile)
    
    def get_service_name(self) -> str:
        return "OpenRouteService"
    
    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with API key"""
        return {
            "Authorization": self.api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
    
    async def get_route(self, start: Tuple[float, float], end: Tuple[float, float]) -> RouteResult:
        """Get route between two points using ORS directions API"""
        if not self.validate_coordinates([start, end]):
            return RouteResult(
                distance=0, duration=0, status="error",
                error_message="Invalid coordinates"
            )
        
        try:
            start_point = RoutePoint(start[0], start[1])
            end_point = RoutePoint(end[0], end[1])
            
            # ORS expects coordinates as [lng, lat]
            coordinates = [start_point.to_coords(), end_point.to_coords()]
            
            url = f"{self.base_url}/v2/directions/{self.ors_profile}"
            
            # Request payload
            payload = {
                "coordinates": coordinates,
                "format": "json",
                "geometry": True,
                "instructions": False
            }
            
            response = await self._make_post_request(url, payload)
            
            if not isinstance(response, dict):
                return RouteResult(
                    distance=0, duration=0, status="error",
                    error_message=f"Invalid response type from ORS: {type(response)}"
                )
            routes = response.get("routes", [])
            if not routes:
                return RouteResult(
                    distance=0, duration=0, status="error",
                    error_message="No routes found"
                )
            
            route = routes[0]
            summary = route.get("summary", {})
            distance_m = summary.get("distance", 0)
            duration_s = summary.get("duration", 0)
            
            # Extract geometry coordinates
            geometry = route.get("geometry", {})
            coordinates_list = geometry.get("coordinates", []) if geometry else []
            
            return RouteResult(
                distance=distance_m / 1000.0,  # Convert to km
                duration=duration_s,
                geometry=coordinates_list,
                status="success"
            )
            
        except Exception as e:
            logger.error(f"ORS route request failed: {str(e)}")
            # Fallback to Euclidean distance
            fallback_distance = self.estimate_euclidean_distance(start, end)
            return RouteResult(
                distance=fallback_distance,
                duration=fallback_distance * 60,  # Rough estimate
                status="fallback",
                error_message=f"Using Euclidean fallback: {str(e)}"
            )
    
    async def get_distance_matrix(self, locations: List[Tuple[float, float]]) -> DistanceMatrix:
        """Get distance matrix using ORS matrix API"""
        if not self.validate_coordinates(locations):
            return DistanceMatrix(
                distances=[], durations=[], status="error",
                error_message="Invalid coordinates"
            )
        
        if len(locations) > 50:  # ORS free tier limit
            logger.warning("Too many locations for ORS free tier. Using pairwise calculation.")
            return await self._calculate_matrix_pairwise(locations)
        
        try:
            points = self._prepare_coordinates(locations)
            
            # Build coordinates array for ORS
            coordinates = [p.to_coords() for p in points]
            
            url = f"{self.base_url}/v2/matrix/{self.ors_profile}"
            
            # Request payload
            payload = {
                "locations": coordinates,
                "metrics": ["distance", "duration"],
                "resolve_locations": False
            }
            
            response = await self._make_post_request(url, payload)
            
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
            logger.error(f"ORS matrix request failed: {str(e)}")
            return await self._calculate_matrix_pairwise(locations)
    
    async def _make_post_request(self, url: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Make HTTP POST request with retries and error handling"""
        if not self.session:
            raise RuntimeError("Router not initialized. Use async context manager.")
        
        headers = self._get_headers()
        
        for attempt in range(self.max_retries):
            try:
                async with self.session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 401:
                        raise RouterError("Invalid API key", self.get_service_name(), 401)
                    elif response.status == 403:
                        raise RouterError("API quota exceeded", self.get_service_name(), 403)
                    elif response.status == 429:
                        logger.warning(f"Rate limit hit for {self.get_service_name()}")
                        await asyncio.sleep(2 ** attempt)  # Exponential backoff
                        continue
                    else:
                        error_text = await response.text()
                        logger.warning(f"HTTP {response.status} from {self.get_service_name()}: {error_text}")
                        try:
                            return await response.json()
                        except Exception:
                            return {"error": error_text, "status_code": response.status}
                        
            except asyncio.TimeoutError:
                logger.warning(f"Timeout on attempt {attempt + 1} for {self.get_service_name()}")
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1} for {self.get_service_name()}: {str(e)}")
            
            if attempt < self.max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        raise Exception(f"Failed to get response from {self.get_service_name()} after {self.max_retries} attempts")
    
    async def _calculate_matrix_pairwise(self, locations: List[Tuple[float, float]]) -> DistanceMatrix:
        """Calculate distance matrix by making pairwise route requests"""
        n = len(locations)
        distances = [[0.0] * n for _ in range(n)]
        durations = [[0.0] * n for _ in range(n)]
        
        # Use semaphore to limit concurrent requests (ORS has rate limits)
        semaphore = asyncio.Semaphore(3)  # Conservative limit
        
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
                    durations[i][j] = dist * 60  # Rough estimate
        
        return DistanceMatrix(
            distances=distances,
            durations=durations,
            status="fallback",
            error_message="Using Euclidean distance fallback"
        )

# Factory function for OpenRouteService client
def create_openroute_client(api_key: str, profile: str = "driving-car") -> OpenRouteClient:
    """Factory function to create OpenRouteService client"""
    if not api_key:
        raise ValueError("OpenRouteService requires an API key. Get one from https://openrouteservice.org/")
    
    return OpenRouteClient(
        api_key=api_key,
        profile=profile,
        timeout=30,
        max_retries=3
    )

async def test_openroute_connection(client: OpenRouteClient) -> bool:
    """Test if OpenRouteService is accessible"""
    try:
        # Test with simple route
        test_start = (40.7128, -74.0060)  # NYC
        test_end = (40.7589, -73.9851)    # Times Square
        
        async with client:
            result = await client.get_route(test_start, test_end)
            return result.status in ["success", "fallback"]
    except Exception as e:
        logger.error(f"OpenRouteService connection test failed: {str(e)}")
        return False