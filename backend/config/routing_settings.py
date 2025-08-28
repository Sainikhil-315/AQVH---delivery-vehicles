"""
Routing service configurations and settings.
Centralized configuration for all routing providers.
"""
import os
from dataclasses import dataclass
from typing import Optional, Dict, Any
from enum import Enum

class RoutingService(Enum):
    """Available routing services"""
    OSRM = "osrm"
    OPENROUTE = "openroute"
    GRAPHHOPPER = "graphhopper"

class RoutingProfile(Enum):
    """Routing profiles for different vehicle types"""
    DRIVING = "driving"
    WALKING = "walking"
    CYCLING = "cycling"
    TRUCK = "truck"

@dataclass
class ServiceConfig:
    """Configuration for a routing service"""
    name: str
    base_url: str
    api_key: Optional[str] = None
    timeout: int = 30
    max_retries: int = 3
    rate_limit_per_minute: int = 60
    default_profile: str = "driving"
    supports_matrix: bool = True
    max_matrix_size: int = 25

class RoutingSettings:
    """Centralized routing configuration"""
    
    def __init__(self):
        self.services = self._load_service_configs()
        self.default_service = RoutingService.OSRM
        self.cache_enabled = True
        self.cache_ttl_hours = 24
        self.fallback_enabled = True
        self.road_distance_factor = 1.3  # Factor to convert euclidean to rough road distance
    
    def _load_service_configs(self) -> Dict[RoutingService, ServiceConfig]:
        """Load service configurations"""
        configs = {}
        
        # OSRM Configuration
        configs[RoutingService.OSRM] = ServiceConfig(
            name="OSRM",
            base_url=os.getenv("OSRM_BASE_URL", "http://router.project-osrm.org"),
            timeout=int(os.getenv("OSRM_TIMEOUT", "30")),
            max_retries=int(os.getenv("OSRM_MAX_RETRIES", "3")),
            rate_limit_per_minute=int(os.getenv("OSRM_RATE_LIMIT", "60")),
            max_matrix_size=int(os.getenv("OSRM_MAX_MATRIX_SIZE", "25"))
        )
        
        # OpenRouteService Configuration
        configs[RoutingService.OPENROUTE] = ServiceConfig(
            name="OpenRouteService",
            base_url=os.getenv("ORS_BASE_URL", "https://api.openrouteservice.org"),
            api_key=os.getenv("eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5ZjBkYmE4OTYxYTQwMWZiMzFhZTU4ZDg0YzM0NjczIiwiaCI6Im11cm11cjY0In0="),
            timeout=int(os.getenv("ORS_TIMEOUT", "30")),
            max_retries=int(os.getenv("ORS_MAX_RETRIES", "3")),
            rate_limit_per_minute=int(os.getenv("ORS_RATE_LIMIT", "40")),
            max_matrix_size=int(os.getenv("ORS_MAX_MATRIX_SIZE", "50"))
        )
        
        # GraphHopper Configuration
        configs[RoutingService.GRAPHHOPPER] = ServiceConfig(
            name="GraphHopper",
            base_url=os.getenv("GH_BASE_URL", "https://graphhopper.com/api/1"),
            api_key=os.getenv("GH_API_KEY"),
            timeout=int(os.getenv("GH_TIMEOUT", "30")),
            max_retries=int(os.getenv("GH_MAX_RETRIES", "3")),
            rate_limit_per_minute=int(os.getenv("GH_RATE_LIMIT", "30")),
            max_matrix_size=int(os.getenv("GH_MAX_MATRIX_SIZE", "100"))
        )
        
        return configs
    
    def get_service_config(self, service: RoutingService) -> ServiceConfig:
        """Get configuration for a specific service"""
        return self.services.get(service, self.services[self.default_service])
    
    def get_available_services(self) -> Dict[str, Dict[str, Any]]:
        """Get list of available and configured services"""
        available = {}
        
        for service, config in self.services.items():
            # Check if service is properly configured
            is_configured = True
            config_status = "ready"
            
            # OpenRouteService and GraphHopper require API keys
            if service in [RoutingService.OPENROUTE, RoutingService.GRAPHHOPPER]:
                if not config.api_key:
                    is_configured = False
                    config_status = "missing_api_key"
            
            # OSRM with demo server has limitations
            if service == RoutingService.OSRM and "project-osrm.org" in config.base_url:
                config_status = "demo_server_limited"
            
            available[service.value] = {
                "name": config.name,
                "configured": is_configured,
                "status": config_status,
                "base_url": config.base_url,
                "has_api_key": config.api_key is not None,
                "max_matrix_size": config.max_matrix_size,
                "rate_limit": config.rate_limit_per_minute
            }
        
        return available
    
    def get_recommended_service(self) -> RoutingService:
        """Get recommended service based on configuration"""
        # Check if we have a self-hosted OSRM
        osrm_config = self.services[RoutingService.OSRM]
        if "project-osrm.org" not in osrm_config.base_url:
            return RoutingService.OSRM
        
        # Check if OpenRouteService is configured
        ors_config = self.services[RoutingService.OPENROUTE]
        if ors_config.api_key:
            return RoutingService.OPENROUTE
        
        # Check if GraphHopper is configured
        gh_config = self.services[RoutingService.GRAPHHOPPER]
        if gh_config.api_key:
            return RoutingService.GRAPHHOPPER
        
        # Default to OSRM demo server
        return RoutingService.OSRM
    
    def validate_service_setup(self, service: RoutingService) -> Dict[str, Any]:
        """Validate if a service is properly set up"""
        config = self.get_service_config(service)
        
        validation = {
            "service": service.value,
            "valid": True,
            "warnings": [],
            "errors": []
        }
        
        # Check API key requirements
        if service in [RoutingService.OPENROUTE, RoutingService.GRAPHHOPPER]:
            if not config.api_key:
                validation["valid"] = False
                validation["errors"].append(f"API key required for {config.name}")
        
        # Check OSRM demo server limitations
        if service == RoutingService.OSRM and "project-osrm.org" in config.base_url:
            validation["warnings"].append(
                "Using OSRM demo server with rate limits. Consider self-hosting for production."
            )
        
        # Check URL format
        if not config.base_url.startswith(("http://", "https://")):
            validation["valid"] = False
            validation["errors"].append("Invalid base URL format")
        
        return validation
    
    def get_cache_settings(self) -> Dict[str, Any]:
        """Get cache configuration"""
        return {
            "enabled": self.cache_enabled,
            "ttl_hours": self.cache_ttl_hours,
            "cache_dir": os.getenv("ROUTING_CACHE_DIR", "cache"),
            "max_cache_size_mb": int(os.getenv("ROUTING_CACHE_MAX_SIZE", "100"))
        }
    
    def update_settings_from_env(self):
        """Update settings from environment variables"""
        self.cache_enabled = os.getenv("ROUTING_CACHE_ENABLED", "true").lower() == "true"
        self.cache_ttl_hours = int(os.getenv("ROUTING_CACHE_TTL_HOURS", "24"))
        self.fallback_enabled = os.getenv("ROUTING_FALLBACK_ENABLED", "true").lower() == "true"
        self.road_distance_factor = float(os.getenv("ROAD_DISTANCE_FACTOR", "1.3"))
        
        default_service_name = os.getenv("DEFAULT_ROUTING_SERVICE", "osrm")
        try:
            self.default_service = RoutingService(default_service_name)
        except ValueError:
            self.default_service = RoutingService.OSRM

# Global settings instance
_routing_settings: Optional[RoutingSettings] = None

def get_routing_settings() -> RoutingSettings:
    """Get or create global routing settings instance"""
    global _routing_settings
    if _routing_settings is None:
        _routing_settings = RoutingSettings()
        _routing_settings.update_settings_from_env()
    return _routing_settings

def get_service_config(service: RoutingService) -> ServiceConfig:
    """Convenience function to get service configuration"""
    settings = get_routing_settings()
    return settings.get_service_config(service)