"""
Abstract base class for routing services.
Provides a common interface for different routing providers (OSRM, OpenRouteService, etc.)
"""
from abc import ABC, abstractmethod
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass
import asyncio
import aiohttp
import logging

logger = logging.getLogger(__name__)

@dataclass
class RoutePoint:
    """Represents a geographic point with latitude and longitude"""
    lat: float
    lng: float
    
    def to_coords(self) -> List[float]:
        """Convert to [lng, lat] format used by most routing APIs"""
        return [self.lng, self.lat]
    
    def to_tuple(self) -> Tuple[float, float]:
        """Convert to (lat, lng) tuple"""
        return (self.lat, self.lng)

@dataclass
class RouteResult:
    """Result from a routing calculation"""
    distance: float  # Distance in kilometers
    duration: float  # Duration in seconds
    geometry: Optional[List[List[float]]] = None  # Route coordinates
    status: str = "success"
    error_message: Optional[str] = None

@dataclass
class DistanceMatrix:
    """Distance matrix result"""
    distances: List[List[float]]  # Distance matrix in km
    durations: List[List[float]]  # Duration matrix in seconds
    status: str = "success"
    error_message: Optional[str] = None

class BaseRouter(ABC):
    """Abstract base class for routing services"""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None, 
                 timeout: int = 30, max_retries: int = 3):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.timeout = timeout
        self.max_retries = max_retries
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout))
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def _prepare_coordinates(self, points: List[Tuple[float, float]]) -> List[RoutePoint]:
        """Convert coordinate tuples to RoutePoint objects"""
        return [RoutePoint(lat=lat, lng=lng) for lat, lng in points]
    
    @abstractmethod
    async def get_route(self, start: Tuple[float, float], 
                       end: Tuple[float, float]) -> RouteResult:
        """Get route between two points"""
        pass
    
    @abstractmethod
    async def get_distance_matrix(self, locations: List[Tuple[float, float]]) -> DistanceMatrix:
        """Get distance matrix for multiple locations"""
        pass
    
    @abstractmethod
    def get_service_name(self) -> str:
        """Return the name of the routing service"""
        pass
    
    async def _make_request(self, url: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
        """Make HTTP request with retries and error handling"""
        if not self.session:
            raise RuntimeError("Router not initialized. Use async context manager.")
        
        for attempt in range(self.max_retries):
            try:
                async with self.session.get(url, params=params) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        logger.warning(f"HTTP {response.status} from {self.get_service_name()}: {await response.text()}")
                        
            except asyncio.TimeoutError:
                logger.warning(f"Timeout on attempt {attempt + 1} for {self.get_service_name()}")
            except Exception as e:
                logger.error(f"Error on attempt {attempt + 1} for {self.get_service_name()}: {str(e)}")
            
            if attempt < self.max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        raise Exception(f"Failed to get response from {self.get_service_name()} after {self.max_retries} attempts")
    
    def validate_coordinates(self, coords: List[Tuple[float, float]]) -> bool:
        """Validate that coordinates are within valid ranges"""
        for lat, lng in coords:
            if not (-90 <= lat <= 90):
                logger.error(f"Invalid latitude: {lat}. Must be between -90 and 90.")
                return False
            if not (-180 <= lng <= 180):
                logger.error(f"Invalid longitude: {lng}. Must be between -180 and 180.")
                return False
        return True
    
    def estimate_euclidean_distance(self, start: Tuple[float, float], 
                                  end: Tuple[float, float]) -> float:
        """Calculate Euclidean distance as fallback (in km)"""
        import math
        
        lat1, lng1 = start
        lat2, lng2 = end
        
        # Haversine formula for great circle distance
        R = 6371  # Earth's radius in kilometers
        
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        dlat = math.radians(lat2 - lat1)
        dlng = math.radians(lng2 - lng1)
        
        a = (math.sin(dlat/2)**2 + 
             math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng/2)**2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        
        return R * c

class RouterError(Exception):
    """Custom exception for routing errors"""
    def __init__(self, message: str, service: str, status_code: Optional[int] = None):
        self.message = message
        self.service = service
        self.status_code = status_code
        super().__init__(f"{service}: {message}")