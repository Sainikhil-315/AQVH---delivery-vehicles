"""
Configuration package initialization.
Provides easy imports for routing settings and API key management.
"""

from .routing_settings import (
    RoutingService,
    RoutingProfile, 
    ServiceConfig,
    RoutingSettings,
    get_routing_settings,
    get_service_config
)
from .api_keys import (
    APIKeyManager,
    APIKeyConfig,
    get_api_key_manager,
    get_api_key,
    setup_demo_environment
)

__all__ = [
    "RoutingService",
    "RoutingProfile",
    "ServiceConfig", 
    "RoutingSettings",
    "get_routing_settings",
    "get_service_config",
    "APIKeyManager",
    "APIKeyConfig",
    "get_api_key_manager", 
    "get_api_key",
    "setup_demo_environment"
]