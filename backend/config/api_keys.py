"""
API key management for routing services.
Handles secure storage and retrieval of API keys for various routing providers.
"""
import os
from typing import Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class APIKeyConfig:
    """Configuration for an API key"""
    service: str
    key: Optional[str]
    env_var: str
    required: bool = False
    configured: bool = False

class APIKeyManager:
    """Manages API keys for routing services"""
    
    def __init__(self):
        self.keys = self._load_api_keys()
    
    def _load_api_keys(self) -> Dict[str, APIKeyConfig]:
        """Load API keys from environment variables"""
        configs = {}
        
        # OpenRouteService API Key
        ors_key = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5ZjBkYmE4OTYxYTQwMWZiMzFhZTU4ZDg0YzM0NjczIiwiaCI6Im11cm11cjY0In0="
        configs["openroute"] = APIKeyConfig(
            service="openroute",
            key=ors_key,
            env_var="eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI5ZjBkYmE4OTYxYTQwMWZiMzFhZTU4ZDg0YzM0NjczIiwiaCI6Im11cm11cjY0In0=",
            required=True,
            configured=ors_key is not None
        )
        
        # GraphHopper API Key
        gh_key = os.getenv("GH_API_KEY")
        configs["graphhopper"] = APIKeyConfig(
            service="graphhopper", 
            key=gh_key,
            env_var="GH_API_KEY",
            required=True,
            configured=gh_key is not None
        )
        
        # OSRM doesn't require API key for demo server
        configs["osrm"] = APIKeyConfig(
            service="osrm",
            key=None,
            env_var="OSRM_API_KEY",  # Optional for self-hosted instances
            required=False,
            configured=True  # Always considered configured
        )
        
        return configs
    
    def get_key(self, service: str) -> Optional[str]:
        """Get API key for a service"""
        config = self.keys.get(service)
        return config.key if config else None
    
    def is_service_configured(self, service: str) -> bool:
        """Check if a service is properly configured"""
        config = self.keys.get(service)
        return config.configured if config else False
    
    def get_missing_keys(self) -> Dict[str, str]:
        """Get list of missing required API keys"""
        missing = {}
        for service, config in self.keys.items():
            if config.required and not config.configured:
                missing[service] = config.env_var
        return missing
    
    def get_status_report(self) -> Dict[str, Any]:
        """Get comprehensive status of all API keys"""
        report = {
            "total_services": len(self.keys),
            "configured_services": 0,
            "missing_required": 0,
            "services": {}
        }
        
        for service, config in self.keys.items():
            service_info = {
                "required": config.required,
                "configured": config.configured,
                "env_var": config.env_var,
                "has_key": config.key is not None
            }
            
            if config.configured:
                report["configured_services"] += 1
            elif config.required:
                report["missing_required"] += 1
            
            report["services"][service] = service_info
        
        return report
    
    def set_key(self, service: str, key: str):
        """Manually set an API key (for testing or runtime configuration)"""
        if service in self.keys:
            self.keys[service].key = key
            self.keys[service].configured = True
    
    def validate_key_format(self, service: str, key: str) -> Dict[str, Any]:
        """Basic validation of API key format"""
        validation = {"valid": False, "message": ""}
        
        if not key or len(key.strip()) == 0:
            validation["message"] = "API key cannot be empty"
            return validation
        
        # Service-specific validation
        if service == "openroute":
            # ORS keys are typically 32-character hex strings
            if len(key) == 32 and all(c in '0123456789abcdefABCDEF-' for c in key):
                validation["valid"] = True
            else:
                validation["message"] = "OpenRouteService API key should be 32-character hex string"
        
        elif service == "graphhopper":
            # GraphHopper keys vary in format, basic length check
            if len(key) >= 10:
                validation["valid"] = True
            else:
                validation["message"] = "GraphHopper API key seems too short"
        
        else:
            # Generic validation
            if len(key) >= 8:
                validation["valid"] = True
            else:
                validation["message"] = "API key seems too short"
        
        return validation
    
    def get_setup_instructions(self) -> Dict[str, str]:
        """Get setup instructions for missing API keys"""
        instructions = {}
        
        missing = self.get_missing_keys()
        for service, env_var in missing.items():
            if service == "openroute":
                instructions[service] = f"""
                OpenRouteService API Key Setup:
                1. Sign up at https://openrouteservice.org/dev/#/signup
                2. Get your free API key (1000 requests/day)
                3. Set environment variable: {env_var}=your_api_key
                4. Or add to .env file: {env_var}=your_api_key
                """
            elif service == "graphhopper":
                instructions[service] = f"""
                GraphHopper API Key Setup:
                1. Sign up at https://www.graphhopper.com/
                2. Get your free API key (1000 requests/day)
                3. Set environment variable: {env_var}=your_api_key
                4. Or add to .env file: {env_var}=your_api_key
                """
        
        return instructions

# Global instance
_api_key_manager: Optional[APIKeyManager] = None

def get_api_key_manager() -> APIKeyManager:
    """Get or create global API key manager"""
    global _api_key_manager
    if _api_key_manager is None:
        _api_key_manager = APIKeyManager()
    return _api_key_manager

def get_api_key(service: str) -> Optional[str]:
    """Convenience function to get API key"""
    manager = get_api_key_manager()
    return manager.get_key(service)

def setup_demo_environment():
    """Setup for demo/testing without real API keys"""
    manager = get_api_key_manager()
    
    # For demo, we'll just use OSRM which doesn't require API keys
    print("Demo Environment Setup:")
    print("- OSRM: Using free demo server (no API key needed)")
    
    missing = manager.get_missing_keys()
    if missing:
        print("- Missing API keys for:", ", ".join(missing.keys()))
        print("- Only OSRM routing will be available")
        
        for service in missing:
            instructions = manager.get_setup_instructions()
            if service in instructions:
                print(f"\n{instructions[service]}")
    
    return manager.get_status_report()