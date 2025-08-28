import React, { useEffect, useRef, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getRouteColors } from "../../utils/mapUtils";
import { AppContext } from "../../context/AppContext";
import { RoutingContext } from "../../context/RoutingContext";

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const RouteMap = ({
  locations = [],
  routes = [],
  depot_index = 0,
  onLocationAdd,
  interactive = true,
  className = "",
  showRoutingPaths = false,
}) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const routeLinesRef = useRef([]);
  const roadRouteLinesRef = useRef([]);

  const { state } = useContext(AppContext);
  const { routingState } = useContext(RoutingContext);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map with proper z-index
    mapInstance.current = L.map(mapRef.current, {
      center: locations.length > 0 ? locations[0] : [40.7128, -74.006],
      zoom: 10,
      zoomControl: true,
      zoomControlOptions: {
        position: "topright",
      },
    });

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Add click handler for adding locations
    if (interactive && onLocationAdd) {
      mapInstance.current.on("click", (e) => {
        onLocationAdd([e.latlng.lat, e.latlng.lng]);
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    console.log("🏗️ [RouteMap] locations:", locations);
    console.log("🏗️ [RouteMap] routes:", routes);
    console.log("🏗️ [RouteMap] state.currentResults:", state.currentResults);
    if (!mapInstance.current) return;

    // Clear existing markers and routes
    markersRef.current.forEach((marker) => marker.remove());
    routeLinesRef.current.forEach((line) => line.remove());
    roadRouteLinesRef.current.forEach((line) => line.remove());
    markersRef.current = [];
    routeLinesRef.current = [];
    roadRouteLinesRef.current = [];

    if (locations.length === 0) return;

    // Add location markers
    locations.forEach((location, index) => {
      const isDepot = index === depot_index;

      const marker = L.marker([location[0], location[1]], {
        icon: L.divIcon({
          html: `<div class="${isDepot ? "depot-marker" : "customer-marker"}">
                   <div class="marker-content">
                     ${isDepot ? "D" : index}
                   </div>
                 </div>`,
          iconSize: [isDepot ? 24 : 20, isDepot ? 24 : 20],
          iconAnchor: [isDepot ? 12 : 10, isDepot ? 12 : 10],
          className: "custom-div-icon",
        }),
        zIndexOffset: isDepot ? 1000 : 500,
      });

      marker.addTo(mapInstance.current);

      // Enhanced popup with routing info
      const routingInfo = routingState?.enabled
        ? `<br><small>Routing: ${routingState.mode} via ${routingState.service}</small>`
        : "";

      marker.bindPopup(`
        <div class="text-sm">
          <strong>${isDepot ? "Depot" : `Customer ${index}`}</strong><br>
          Lat: ${location[0].toFixed(4)}<br>
          Lng: ${location[1].toFixed(4)}${routingInfo}
        </div>
      `);

      markersRef.current.push(marker);
    });

    // Add route lines
    if (routes.length > 0) {
      const colors = getRouteColors(routes.length);

      routes.forEach((route, routeIndex) => {
        console.log(`🚗 [RouteMap] Rendering route ${routeIndex + 1}`);
        let polyline;

        if (state.currentResults?.geometries?.[routeIndex]) {
          console.log(
            `✅ Using road geometry for route ${routeIndex + 1}, points:`,
            state.currentResults.geometries[routeIndex].length
          );
          polyline = L.polyline(state.currentResults.geometries[routeIndex], {
            color: colors[routeIndex],
            weight: 4,
            opacity: 0.9,
          });
        } else {
          console.log(
            `⚠️ No geometry found, falling back to Euclidean for route ${
              routeIndex + 1
            }`
          );
          const routeCoords = route.map(
            (locationIndex) => locations[locationIndex]
          );
          polyline = L.polyline(routeCoords, {
            color: colors[routeIndex],
            weight: 2,
            dashArray: "4 6",
            opacity: 0.7,
          });
        }

        // ✅ Add polyline to map
        polyline.addTo(mapInstance.current);
        routeLinesRef.current.push(polyline);

        // ✅ Attach popup to polyline
        polyline.bindPopup(`
    <div class="text-sm">
      <strong>Vehicle ${routeIndex + 1}</strong><br>
      Source: ${
        state.currentResults?.geometries?.[routeIndex]
          ? "OSRM/ORS Geometry"
          : "Euclidean"
      }<br>
      Points: ${polyline.getLatLngs().length}
    </div>
  `);

        console.log(
          `🖌️ [RouteMap] Polyline for route ${routeIndex + 1} added with ${
            polyline.getLatLngs().length
          } points`
        );
      });
    }

    // Display road routing comparison if enabled
    if (showRoutingPaths && routingState.enabled && routes.length > 0) {
      displayRoadRoutingPaths(routes, locations, colors);
    }

    // Fit bounds if we have locations
    if (locations.length > 0) {
      const group = new L.featureGroup(markersRef.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [locations, routes, depot_index, routingState, showRoutingPaths]);

  const calculateRouteDistance = (route, locations, useRoadRouting = false) => {
    let distance = 0;

    if (
      useRoadRouting &&
      state.results?.routing_info?.distance_matrix_source !== "euclidean"
    ) {
      // Use actual road distances from the solver result if available
      const results = state.results;
      if (results?.routing_info?.actual_distances) {
        for (let i = 0; i < route.length - 1; i++) {
          const from = route[i];
          const to = route[i + 1];
          distance += results.routing_info.actual_distances[from][to] || 0;
        }
        return distance;
      }
    }

    // Fallback to euclidean calculation
    for (let i = 0; i < route.length - 1; i++) {
      const loc1 = locations[route[i]];
      const loc2 = locations[route[i + 1]];
      distance += Math.sqrt(
        Math.pow(loc1[0] - loc2[0], 2) + Math.pow(loc1[1] - loc2[1], 2)
      );
    }

    return useRoadRouting ? distance : distance * 111; // Rough conversion to km for euclidean
  };

  const displayRoadRoutingPaths = async (routes, locations, colors) => {
    // This would fetch and display actual road routing paths
    // For now, we'll show a visual indication that road routing is active
    if (!mapInstance.current) return;

    try {
      routes.forEach((route, routeIndex) => {
        if (route.length > 1) {
          const routeCoords = route.map(
            (locationIndex) => locations[locationIndex]
          );

          // Create a thicker, semi-transparent line to show road routing is active
          const roadLine = L.polyline(routeCoords, {
            color: colors[routeIndex],
            weight: 6,
            opacity: 0.3,
            interactive: false,
            className: "road-routing-indicator",
          });

          roadLine.addTo(mapInstance.current);
          roadRouteLinesRef.current.push(roadLine);
        }
      });
    } catch (error) {
      console.warn("Failed to display road routing paths:", error);
    }
  };

  return (
    <div className={`map-container relative ${className}`}>
      <div
        ref={mapRef}
        className="w-full h-full min-h-[400px] rounded-lg relative"
        style={{ zIndex: 1 }}
      />

      {/* Routing Status Indicator */}
      {routingState?.enabled && (
        <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg text-xs z-10 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                routingState.serviceStatus[routingState.service] === "healthy"
                  ? "bg-green-500"
                  : "bg-yellow-500"
              }`}
            ></div>
            <span className="text-gray-600 dark:text-gray-400">
              Road Routing: {routingState.mode} via {routingState.service}
            </span>
          </div>
        </div>
      )}

      {/* Interactive Help */}
      {interactive && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg text-xs z-10 border border-gray-200 dark:border-gray-600">
          <p className="text-gray-600 dark:text-gray-400">
            Click on map to add locations
          </p>
          {locations.length > 0 && (
            <p className="text-gray-500 dark:text-gray-500 mt-1">
              {locations.length} location{locations.length !== 1 ? "s" : ""}{" "}
              added
            </p>
          )}
        </div>
      )}

      {/* Routing Legend */}
      {routes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg text-xs z-10 border border-gray-200 dark:border-gray-600 max-w-xs">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
            Routes
          </h4>
          <div className="space-y-1">
            {routes.map((route, index) => {
              const colors = getRouteColors(routes.length);
              const distance = calculateRouteDistance(
                route,
                locations,
                routingState.enabled
              );

              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-0.5"
                      style={{ backgroundColor: colors[index] }}
                    ></div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Vehicle {index + 1}
                    </span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-500">
                    {distance.toFixed(1)}
                    {routingState.enabled ? "km" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {routingState.enabled && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center space-x-1">
                <div
                  className="w-3 h-0.5 bg-gray-400"
                  style={{ opacity: 0.8 }}
                ></div>
                <span className="text-gray-500 dark:text-gray-500">
                  Road routing
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-0.5 border-b border-dashed border-gray-400"></div>
                <span className="text-gray-500 dark:text-gray-500">
                  Direct line
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RouteMap;
