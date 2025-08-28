"""
Routing module for road-based distance calculations.
Provides interfaces for different routing services (OSRM, OpenRouteService, etc.)
"""
from .base_router import BaseRouter, RouteResult, DistanceMatrix, RoutePoint, RouterError
from .osrm_client import OSRMClient, create_osrm_client, test_osrm_connection
from .openroute_client import OpenRouteClient, create_openroute_client
from .routing_cache import RoutingCache, get_cache_instance

__all__ = [
    # Base classes
    'BaseRouter',
    'RouteResult', 
    'DistanceMatrix',
    'RoutePoint',
    'RouterError',
    
    # OSRM client
    'OSRMClient',
    'create_osrm_client',
    'test_osrm_connection',
    
    # OpenRouteService client
    'OpenRouteClient',
    'create_openroute_client',
    
    # Caching
    'RoutingCache',
    'get_cache_instance'
]

# Version info
__version__ = "1.0.0"
__author__ = "Quantum VRP Team"
__description__ = "Road routing services for Vehicle Routing Problem optimization"