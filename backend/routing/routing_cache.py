"""
Simple file-based caching system for routing API responses.
Reduces API calls and improves performance for repeated route calculations.
"""
import json
import hashlib
import os
import time
from typing import Dict, Any, Optional, List, Tuple
from dataclasses import asdict
import logging
from .base_router import RouteResult, DistanceMatrix

logger = logging.getLogger(__name__)

class RoutingCache:
    """File-based cache for routing results"""
    
    def __init__(self, cache_dir: str = "cache", cache_ttl: int = 3600):
        """
        Initialize routing cache
        
        Args:
            cache_dir: Directory to store cache files
            cache_ttl: Cache time-to-live in seconds (default: 1 hour)
        """
        self.cache_dir = cache_dir
        self.cache_ttl = cache_ttl
        
        # Create cache directory if it doesn't exist
        os.makedirs(cache_dir, exist_ok=True)
        
        self.route_cache_file = os.path.join(cache_dir, "route_cache.json")
        self.matrix_cache_file = os.path.join(cache_dir, "matrix_cache.json")
        
        # Load existing cache
        self.route_cache = self._load_cache(self.route_cache_file)
        self.matrix_cache = self._load_cache(self.matrix_cache_file)
    
    def _load_cache(self, filename: str) -> Dict[str, Any]:
        """Load cache from JSON file"""
        try:
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    cache = json.load(f)
                    # Clean expired entries
                    return self._clean_expired_entries(cache)
            return {}
        except Exception as e:
            logger.warning(f"Failed to load cache from {filename}: {str(e)}")
            return {}
    
    def _save_cache(self, cache: Dict[str, Any], filename: str):
        """Save cache to JSON file"""
        try:
            with open(filename, 'w') as f:
                json.dump(cache, f, indent=2)
        except Exception as e:
            logger.error(f"Failed to save cache to {filename}: {str(e)}")
    
    def _clean_expired_entries(self, cache: Dict[str, Any]) -> Dict[str, Any]:
        """Remove expired cache entries"""
        current_time = time.time()
        cleaned_cache = {}
        
        for key, value in cache.items():
            if isinstance(value, dict) and 'timestamp' in value:
                if current_time - value['timestamp'] < self.cache_ttl:
                    cleaned_cache[key] = value
                    
        return cleaned_cache
    
    def _generate_route_key(self, start: Tuple[float, float], end: Tuple[float, float], 
                           service: str, profile: str = "driving") -> str:
        """Generate unique cache key for route request"""
        # Round coordinates to reduce cache misses due to tiny differences
        start_rounded = (round(start[0], 6), round(start[1], 6))
        end_rounded = (round(end[0], 6), round(end[1], 6))
        
        key_data = f"{service}_{profile}_{start_rounded}_{end_rounded}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _generate_matrix_key(self, locations: List[Tuple[float, float]], 
                           service: str, profile: str = "driving") -> str:
        """Generate unique cache key for distance matrix request"""
        locations_rounded = tuple((round(lat, 6), round(lng, 6)) for lat, lng in locations)
        key_data = f"{service}_{profile}_{locations_rounded}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get_route(self, start: Tuple[float, float], end: Tuple[float, float],
                  service: str, profile: str = "driving") -> Optional[RouteResult]:
        """Get cached route result"""
        key = self._generate_route_key(start, end, service, profile)
        
        if key in self.route_cache:
            cached_data = self.route_cache[key]
            
            # Check if cache entry is still valid
            if time.time() - cached_data['timestamp'] < self.cache_ttl:
                logger.debug(f"Cache hit for route {service}: {start} -> {end}")
                
                # Convert cached data back to RouteResult
                result_data = cached_data['result']
                return RouteResult(
                    distance=result_data['distance'],
                    duration=result_data['duration'],
                    geometry=result_data.get('geometry'),
                    status=result_data['status'],
                    error_message=result_data.get('error_message')
                )
        
        return None
    
    def set_route(self, start: Tuple[float, float], end: Tuple[float, float],
                  service: str, result: RouteResult, profile: str = "driving"):
        """Cache route result"""
        key = self._generate_route_key(start, end, service, profile)
        
        cache_entry = {
            'timestamp': time.time(),
            'result': asdict(result),
            'request': {
                'start': start,
                'end': end,
                'service': service,
                'profile': profile
            }
        }
        
        self.route_cache[key] = cache_entry
        self._save_cache(self.route_cache, self.route_cache_file)
        
        logger.debug(f"Cached route for {service}: {start} -> {end}")
    
    def get_matrix(self, locations: List[Tuple[float, float]], 
                   service: str, profile: str = "driving") -> Optional[DistanceMatrix]:
        """Get cached distance matrix result"""
        key = self._generate_matrix_key(locations, service, profile)
        
        if key in self.matrix_cache:
            cached_data = self.matrix_cache[key]
            
            # Check if cache entry is still valid
            if time.time() - cached_data['timestamp'] < self.cache_ttl:
                logger.debug(f"Cache hit for matrix {service}: {len(locations)} locations")
                
                # Convert cached data back to DistanceMatrix
                result_data = cached_data['result']
                return DistanceMatrix(
                    distances=result_data['distances'],
                    durations=result_data['durations'],
                    status=result_data['status'],
                    error_message=result_data.get('error_message')
                )
        
        return None
    
    def set_matrix(self, locations: List[Tuple[float, float]], 
                   service: str, result: DistanceMatrix, profile: str = "driving"):
        """Cache distance matrix result"""
        key = self._generate_matrix_key(locations, service, profile)
        
        cache_entry = {
            'timestamp': time.time(),
            'result': asdict(result),
            'request': {
                'locations': locations,
                'service': service,
                'profile': profile
            }
        }
        
        self.matrix_cache[key] = cache_entry
        self._save_cache(self.matrix_cache, self.matrix_cache_file)
        
        logger.debug(f"Cached matrix for {service}: {len(locations)} locations")
    
    def clear_cache(self):
        """Clear all cached data"""
        self.route_cache.clear()
        self.matrix_cache.clear()
        
        # Remove cache files
        for filename in [self.route_cache_file, self.matrix_cache_file]:
            if os.path.exists(filename):
                os.remove(filename)
        
        logger.info("Routing cache cleared")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        current_time = time.time()
        
        route_entries = len(self.route_cache)
        matrix_entries = len(self.matrix_cache)
        
        # Count expired entries
        route_expired = sum(1 for entry in self.route_cache.values() 
                           if current_time - entry['timestamp'] >= self.cache_ttl)
        matrix_expired = sum(1 for entry in self.matrix_cache.values() 
                            if current_time - entry['timestamp'] >= self.cache_ttl)
        
        return {
            'route_cache': {
                'total_entries': route_entries,
                'expired_entries': route_expired,
                'valid_entries': route_entries - route_expired
            },
            'matrix_cache': {
                'total_entries': matrix_entries,
                'expired_entries': matrix_expired,
                'valid_entries': matrix_entries - matrix_expired
            },
            'cache_ttl_hours': self.cache_ttl / 3600,
            'cache_directory': self.cache_dir
        }
    
    def cleanup_expired(self):
        """Remove expired cache entries and save"""
        self.route_cache = self._clean_expired_entries(self.route_cache)
        self.matrix_cache = self._clean_expired_entries(self.matrix_cache)
        
        self._save_cache(self.route_cache, self.route_cache_file)
        self._save_cache(self.matrix_cache, self.matrix_cache_file)
        
        logger.info("Cleaned up expired cache entries")

# Global cache instance
_cache_instance: Optional[RoutingCache] = None

def get_cache_instance(cache_dir: str = "cache", cache_ttl: int = 3600) -> RoutingCache:
    """Get or create global cache instance"""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = RoutingCache(cache_dir, cache_ttl)
    return _cache_instance