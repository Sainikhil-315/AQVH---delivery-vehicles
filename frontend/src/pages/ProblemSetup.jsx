import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Play, AlertTriangle } from "lucide-react";
import LocationInput from "../components/forms/LocationInput";
import VehicleSettings from "../components/forms/VehicleSettings";
import AlgorithmSelector from "../components/forms/AlgorithmSelector";
import ParameterTuning from "../components/forms/ParameterTuning";
import RouteMap from "../components/visualization/RouteMap";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Tabs from "../components/ui/Tabs";
import { useApp } from "../context/AppContext";
import { useAPI } from "../hooks/useAPI";
import { validateProblem, validateQuantumLimits } from "../utils/validation";

const ProblemSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useApp();
  const { compareAll, loading } = useAPI();

  const [locations, setLocations] = useState(
    state.currentProblem.locations || []
  );
  const [num_vehicles, setnum_vehicles] = useState(
    state.currentProblem.num_vehicles || 2
  );
  const [depot_index, setdepot_index] = useState(
    state.currentProblem.depot_index || 0
  );
  const [selectedAlgorithms, setSelectedAlgorithms] = useState(
    state.selectedAlgorithms
  );
  const [parameters, setParameters] = useState({
    quantum: { maxIterations: 50, pLayers: 2, shots: 1024 },
    classical: { maxIterations: 100, populationSize: 50, generations: 100 },
  });
  const [errors, setErrors] = useState([]);

  // Load quick start data if requested
  useEffect(() => {
    if (searchParams.get("quick") === "true") {
      const quickLocations = [
        [40.7128, -74.006], // NYC (Depot)
        [40.7589, -73.9851], // Times Square
        [40.7505, -73.9934], // Empire State
        [40.7614, -73.9776], // Central Park
        [40.7282, -74.0776], // Liberty Island
      ];
      setLocations(quickLocations);
      setSelectedAlgorithms({
        classical: ["nearest_neighbor", "genetic_algorithm"],
        quantum: ["SPSA", "COBYLA"],
      });
    }
  }, [searchParams]);

  const handleLocationAdd = (newLocation) => {
    setLocations([...locations, newLocation]);
  };

  const validateCurrentSetup = () => {
    const problem = { locations, num_vehicles, depot_index };
    const validation = validateProblem(problem);
    const quantumLimits = validateQuantumLimits(problem);

    const newErrors = [];

    if (!validation.valid) {
      newErrors.push(...validation.errors);
    }

    if (selectedAlgorithms.quantum.length > 0 && !quantumLimits.feasible) {
      newErrors.push(quantumLimits.message);
    }

    if (
      selectedAlgorithms.classical.length === 0 &&
      selectedAlgorithms.quantum.length === 0
    ) {
      newErrors.push("Please select at least one algorithm");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSolve = async () => {
    if (!validateCurrentSetup()) return;

    const problem = { locations, num_vehicles, depot_index };

    // Update global state
    dispatch({ type: "SET_PROBLEM", payload: problem });
    dispatch({ type: "SET_SELECTED_ALGORITHMS", payload: selectedAlgorithms });
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const results = await compareAll(
        problem,
        selectedAlgorithms.quantum,
        selectedAlgorithms.classical,
        parameters.quantum
      );

      // Add to history
      dispatch({
        type: "ADD_TO_HISTORY",
        payload: {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          problem,
          results,
          type: "comparison",
          algorithms: { ...selectedAlgorithms },
        },
      });

      dispatch({ type: "SET_RESULTS", payload: results });
      navigate("/results");
    } catch (error) {
      console.error("Optimization failed:", error);
    } finally {
      dispatch({ type: "SET_LOADING", payload: false });
    }
  };

  const quantumLimits = validateQuantumLimits({ locations, num_vehicles });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Problem Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure your Vehicle Routing Problem and select optimization
          algorithms
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Validation Errors */}
          {errors.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <Card.Content className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800 dark:text-red-200">
                      Configuration Issues
                    </h4>
                    <ul className="mt-2 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          <Tabs defaultTab={0}>
            <Tabs.Tab label="Locations & Vehicles">
              <div className="space-y-6">
                <LocationInput
                  locations={locations}
                  onLocationsChange={setLocations}
                  depot_index={depot_index}
                />

                <VehicleSettings
                  num_vehicles={num_vehicles}
                  onnum_vehiclesChange={setnum_vehicles}
                  depot_index={depot_index}
                  onDepotChange={setdepot_index}
                  locations={locations}
                />
              </div>
            </Tabs.Tab>

            <Tabs.Tab label="Algorithms">
              <AlgorithmSelector
                selectedAlgorithms={selectedAlgorithms}
                onSelectionChange={setSelectedAlgorithms}
              />
            </Tabs.Tab>

            <Tabs.Tab label="Parameters">
              <ParameterTuning
                parameters={parameters}
                onParametersChange={setParameters}
              />
            </Tabs.Tab>
          </Tabs>

          {/* Quantum Limits Warning */}
          {selectedAlgorithms.quantum.length > 0 && !quantumLimits.feasible && (
            <Card className="border-yellow-200 dark:border-yellow-800">
              <Card.Content className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Quantum Simulation Limits
                    </h4>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                      Problem requires {quantumLimits.qubits} qubits (max: 20).
                      Try with ≤{quantumLimits.maxLocations} locations or use
                      classical algorithms only.
                    </p>
                  </div>
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              variant="quantum"
              size="lg"
              onClick={handleSolve}
              loading={loading}
              disabled={errors.length > 0}
              className="flex-1"
            >
              <Play className="h-5 w-5 mr-2" />
              {loading ? "Optimizing..." : "Start Optimization"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setLocations([]);
                setSelectedAlgorithms({ classical: [], quantum: [] });
                setErrors([]);
              }}
            >
              Reset
            </Button>
          </div>
        </div>

        {/* Right Column - Map Visualization */}
        <div className="space-y-6">
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium">Interactive Map</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Click to add locations or drag existing ones
              </p>
            </Card.Header>

            <Card.Content className="p-0 mb-4">
              <RouteMap
                locations={locations}
                depot_index={depot_index}
                onLocationAdd={handleLocationAdd}
                interactive={true}
                className="h-96"
              />
            </Card.Content>
          </Card>

          {/* Problem Summary */}
          <Card>
            <Card.Header>
              <h3 className="text-lg font-medium">Problem Summary</h3>
            </Card.Header>

            <Card.Content>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Total Locations:
                  </span>
                  <span className="font-medium">{locations.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Customer Locations:
                  </span>
                  <span className="font-medium">
                    {Math.max(0, locations.length - 1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Vehicles:
                  </span>
                  <span className="font-medium">{num_vehicles}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    Selected Algorithms:
                  </span>
                  <span className="font-medium">
                    {selectedAlgorithms.classical.length +
                      selectedAlgorithms.quantum.length}
                  </span>
                </div>
                {quantumLimits.feasible &&
                  selectedAlgorithms.quantum.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">
                        Estimated Qubits:
                      </span>
                      <span className="font-medium text-quantum-600">
                        {Math.max(0, quantumLimits.qubits)}
                      </span>
                    </div>
                  )}
              </div>
            </Card.Content>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ProblemSetup;
