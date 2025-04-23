import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom marker icons
const currentLocationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function StepTracker({ account }) {
    const [steps, setSteps] = useState(() => {
        // Initialize steps from localStorage during state initialization
        const savedSteps = localStorage.getItem('runchain_steps');
        return savedSteps ? parseInt(savedSteps, 10) : 0;
    });

    const [dailyGoal, setDailyGoal] = useState(10000);
    const [manualSteps, setManualSteps] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });
    const [trackingMode, setTrackingMode] = useState('manual'); // 'manual', 'gps', or 'real-gps'
    const [isTracking, setIsTracking] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(null);
    const [routePositions, setRoutePositions] = useState([]);
    const [totalDistance, setTotalDistance] = useState(0);
    const [simulateSpeed, setSimulateSpeed] = useState(5); // km/h
    const simulationIntervalRef = useRef(null);
    const watchPositionIdRef = useRef(null);
    const [isGpsAvailable, setIsGpsAvailable] = useState(false);
    const lastPositionRef = useRef(null);
    const pendingStepsRef = useRef(0); // Track partial steps for point calculation

    const [points, setPoints] = useState(() => {
        // Initialize points from localStorage during state initialization
        const savedPoints = localStorage.getItem('runchain_points');
        return savedPoints ? parseInt(savedPoints, 10) : 0;
    });

    // Point conversion rate: steps to points
    const STEPS_PER_POINT = 100; // 100 steps = 1 point

    // Average step length in meters
    const AVERAGE_STEP_LENGTH = 0.75;

    // Point thresholds for rewards (these will be visible in RedeemRewards)
    const pointThresholds = [
        { points: 50, reward: "0.001 ETH", claimed: false },
        { points: 200, reward: "0.005 ETH", claimed: false },
        { points: 500, reward: "0.01 ETH", claimed: false }
    ];

    // Update localStorage when steps or points change
    useEffect(() => {
        localStorage.setItem('runchain_steps', steps.toString());
        // Also update points when steps change
        updatePointsFromSteps(steps);
    }, [steps]);

    // Update localStorage when points change
    useEffect(() => {
        localStorage.setItem('runchain_points', points.toString());
    }, [points]);

    // Function to calculate points based on steps
    const updatePointsFromSteps = (currentSteps) => {
        const calculatedPoints = Math.floor(currentSteps / STEPS_PER_POINT);
        setPoints(calculatedPoints);
    };

    // Check if geolocation is available in the browser
    useEffect(() => {
        if (navigator.geolocation) {
            setIsGpsAvailable(true);
        } else {
            setIsGpsAvailable(false);
        }
    }, []);

    // Clean up intervals and watchers on unmount
    useEffect(() => {
        return () => {
            if (simulationIntervalRef.current) {
                clearInterval(simulationIntervalRef.current);
            }
            if (watchPositionIdRef.current) {
                navigator.geolocation.clearWatch(watchPositionIdRef.current);
            }
        };
    }, []);

    // Calculate distance between two coordinates in kilometers using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Earth's radius in kilometers
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c; // Distance in kilometers
        return distance;
    };

    // Convert kilometers to steps
    const distanceToSteps = (distanceKm) => {
        const distanceMeters = distanceKm * 1000;
        return Math.floor(distanceMeters / AVERAGE_STEP_LENGTH);
    };

    // Update map view to center on current position
    const MapUpdater = ({ position }) => {
        const map = useMap();

        useEffect(() => {
            if (position) {
                map.setView(position, map.getZoom());
            }
        }, [position, map]);

        return null;
    };

    const addSteps = (e) => {
        e.preventDefault();
        const stepsToAdd = parseInt(manualSteps, 10);
        if (isNaN(stepsToAdd) || stepsToAdd <= 0) {
            setMessage({ text: 'Please enter a valid number of steps', type: 'error' });
            return;
        }

        // Update steps
        const newTotalSteps = steps + stepsToAdd;
        setSteps(newTotalSteps);

        // Points calculation is now handled by the useEffect

        // Clear the input field
        setManualSteps('');

        // Calculate points earned for the message
        const pointsEarned = Math.floor(stepsToAdd / STEPS_PER_POINT);

        // Set success message
        if (pointsEarned > 0) {
            setMessage({
                text: `Added ${stepsToAdd} steps successfully! You earned ${pointsEarned} points.`,
                type: 'success'
            });
        } else {
            setMessage({
                text: `Added ${stepsToAdd} steps successfully!`,
                type: 'success'
            });
        }
    };

    // Start GPS tracking simulation
    const startTracking = () => {
        // Reset pending steps counter when starting tracking
        pendingStepsRef.current = 0;

        if (trackingMode === 'gps') {
            // Simulation mode
            if (!currentPosition) {
                // Default to a random location if none is set
                const defaultPosition = [40.7128, -74.0060]; // New York City
                setCurrentPosition(defaultPosition);
                setRoutePositions([defaultPosition]);
            }

            setIsTracking(true);
            setMessage({ text: 'GPS simulation started!', type: 'info' });

            // Simulate movement every 2 seconds
            simulationIntervalRef.current = setInterval(() => {
                simulateMovement();
            }, 2000);
        } else if (trackingMode === 'real-gps') {
            // Real GPS tracking mode
            setIsTracking(true);
            setMessage({ text: 'Real GPS tracking started!', type: 'info' });

            // Reset positions if needed
            if (routePositions.length === 0 && currentPosition) {
                setRoutePositions([currentPosition]);
            }

            // Start watching position
            watchPositionIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const newPosition = [latitude, longitude];

                    // Update current position
                    setCurrentPosition(newPosition);

                    // Add to route positions
                    setRoutePositions(prev => {
                        const newRoutePositions = [...prev, newPosition];

                        // Calculate distance if we have at least 2 positions
                        if (lastPositionRef.current) {
                            const distance = calculateDistance(
                                lastPositionRef.current[0], lastPositionRef.current[1],
                                latitude, longitude
                            );

                            // Only process if we've moved a reasonable amount (5 meters)
                            // This filters out GPS jitter
                            if (distance > 0.005) {
                                // Update total distance
                                setTotalDistance(prevDist => {
                                    const newDist = prevDist + distance;
                                    console.log(`Distance updated: +${distance.toFixed(4)} km, total: ${newDist.toFixed(4)} km`);
                                    return newDist;
                                });

                                // Calculate steps from distance
                                const newSteps = distanceToSteps(distance);
                                console.log(`New steps calculated: ${newSteps} from ${distance.toFixed(4)} km`);

                                if (newSteps > 0) {
                                    // Update steps directly
                                    setSteps(prevSteps => {
                                        const updatedSteps = prevSteps + newSteps;
                                        console.log(`Steps updated: ${prevSteps} → ${updatedSteps}`);
                                        return updatedSteps;
                                    });
                                }
                            }
                        }

                        // Update last position reference
                        lastPositionRef.current = newPosition;
                        return newRoutePositions;
                    });
                },
                (error) => {
                    console.error("GPS error:", error);
                    setMessage({
                        text: `GPS error: ${error.message}. Falling back to simulation.`,
                        type: 'error'
                    });

                    // Fall back to simulation mode
                    setTrackingMode('gps');
                    startTracking();
                },
                // Options for watchPosition
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
        }
    };

    // Stop GPS tracking
    const stopTracking = () => {
        if (simulationIntervalRef.current) {
            clearInterval(simulationIntervalRef.current);
        }

        if (watchPositionIdRef.current) {
            navigator.geolocation.clearWatch(watchPositionIdRef.current);
            watchPositionIdRef.current = null;
        }

        // Add any pending steps before stopping
        if (pendingStepsRef.current > 0) {
            setSteps(prev => prev + pendingStepsRef.current);
            pendingStepsRef.current = 0;
        }

        setIsTracking(false);
        lastPositionRef.current = null;
        setMessage({ text: 'GPS tracking stopped! Steps and points updated.', type: 'success' });
    };

    // Simulate movement by generating a new position nearby
    const simulateMovement = () => {
        if (!currentPosition) return;

        // Calculate how far to move based on speed (km/h) and time interval
        const timeInterval = 2; // seconds
        const distanceKm = (simulateSpeed / 3600) * timeInterval;

        // Generate random direction
        const angle = Math.random() * 2 * Math.PI;

        // Convert distance to changes in lat/lng
        // Rough approximation: 1 degree latitude = 111 km
        const latChange = (distanceKm / 111) * Math.cos(angle);
        const lngChange = (distanceKm / (111 * Math.cos(currentPosition[0] * Math.PI / 180))) * Math.sin(angle);

        const newPosition = [
            currentPosition[0] + latChange,
            currentPosition[1] + lngChange
        ];

        // Calculate actual distance moved
        const actualDistance = calculateDistance(
            currentPosition[0], currentPosition[1],
            newPosition[0], newPosition[1]
        );

        // Update total distance
        const newTotalDistance = totalDistance + actualDistance;
        setTotalDistance(newTotalDistance);

        // Calculate steps from distance
        const newSteps = distanceToSteps(actualDistance);
        console.log(`Simulation: ${newSteps} steps from ${actualDistance.toFixed(4)} km`);

        // Update steps
        if (newSteps > 0) {
            setSteps(prevSteps => {
                const updatedSteps = prevSteps + newSteps;
                console.log(`Simulation steps updated: ${prevSteps} → ${updatedSteps}`);
                return updatedSteps;
            });
        }

        // Update position and route
        setCurrentPosition(newPosition);
        setRoutePositions(prev => [...prev, newPosition]);
    };

    // Handle map clicks to set position manually
    const MapClickHandler = () => {
        useMapEvents({
            click: (e) => {
                if (!isTracking) {
                    const { lat, lng } = e.latlng;
                    setCurrentPosition([lat, lng]);
                    setRoutePositions([[lat, lng]]);
                    setMessage({ text: 'Starting position set. You can now start tracking.', type: 'info' });
                }
            }
        });
        return null;
    };

    // Get user's current GPS location
    const getUserLocation = () => {
        if (navigator.geolocation) {
            setMessage({ text: 'Getting your current location...', type: 'info' });

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setCurrentPosition([latitude, longitude]);
                    setRoutePositions([[latitude, longitude]]);
                    setMessage({ text: 'Location found! You can now start tracking.', type: 'success' });
                },
                (error) => {
                    console.error("Error getting location:", error);
                    setMessage({ text: `Could not get your location: ${error.message}`, type: 'error' });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setMessage({ text: 'Geolocation is not supported by your browser.', type: 'error' });
        }
    };

    const resetProgress = () => {
        if (window.confirm('Are you sure you want to reset your step progress and points?')) {
            setSteps(0);
            setPoints(0);
            setTotalDistance(0);
            setRoutePositions([]);
            pendingStepsRef.current = 0;
            if (currentPosition) {
                setRoutePositions([currentPosition]);
            }
            localStorage.removeItem('runchain_steps');
            localStorage.removeItem('runchain_points');
            setMessage({ text: 'Progress has been reset', type: 'info' });
        }
    };

    return (
        <div className="step-tracker-container">
            {message.text && (
                <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'error' ? 'alert-danger' : 'alert-info'} mb-4`}>
                    {message.text}
                </div>
            )}

            <div className="tracking-mode-toggle mb-4">
                <div className="btn-group w-100">
                    <button
                        className={`btn ${trackingMode === 'manual' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setTrackingMode('manual')}
                        disabled={isTracking}
                    >
                        <i className="fas fa-pencil-alt me-2"></i>
                        Manual Entry
                    </button>
                    <button
                        className={`btn ${trackingMode === 'gps' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setTrackingMode('gps')}
                        disabled={isTracking}
                    >
                        <i className="fas fa-map-marker-alt me-2"></i>
                        Simulation
                    </button>
                    {isGpsAvailable && (
                        <button
                            className={`btn ${trackingMode === 'real-gps' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => setTrackingMode('real-gps')}
                            disabled={isTracking}
                        >
                            <i className="fas fa-satellite me-2"></i>
                            Real GPS
                        </button>
                    )}
                </div>
            </div>

            <div className="step-stats">
                <div className="stat-box">
                    <div className="stat-value">{steps.toLocaleString()}</div>
                    <div className="stat-label">Total Steps</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{Math.round((steps / dailyGoal) * 100)}%</div>
                    <div className="stat-label">Daily Goal</div>
                </div>
                <div className="stat-box">
                    <div className="stat-value">{points}</div>
                    <div className="stat-label">Points Earned</div>
                </div>
                {(trackingMode === 'gps' || trackingMode === 'real-gps') && (
                    <div className="stat-box">
                        <div className="stat-value">{totalDistance.toFixed(2)}</div>
                        <div className="stat-label">Kilometers</div>
                    </div>
                )}
            </div>

            <div className="progress mb-4">
                <progress value={steps} max={dailyGoal} style={{ width: '100%' }}></progress>
                <div className="text-center mt-2">
                    <small>{steps} / {dailyGoal.toLocaleString()} steps</small>
                </div>
            </div>

            {trackingMode === 'manual' ? (
                <div className="step-input mb-4">
                    <h5>Add Steps Manually</h5>
                    <form onSubmit={addSteps}>
                        <div className="input-group">
                            <input
                                type="number"
                                value={manualSteps}
                                onChange={(e) => setManualSteps(e.target.value)}
                                placeholder="Enter steps"
                                className="form-control"
                                min="1"
                            />
                            <button type="submit" className="btn btn-primary">Add Steps</button>
                        </div>
                    </form>
                    <div className="mt-2">
                        <small className="text-muted">Every {STEPS_PER_POINT} steps = 1 reward point</small>
                    </div>
                </div>
            ) : (
                <div className="gps-tracker mb-4">
                    <h5>{trackingMode === 'real-gps' ? 'Real GPS' : 'GPS Simulation'} Step Tracker</h5>
                    <div className="card">
                        <div className="card-body">
                            <div style={{ height: '300px', marginBottom: '15px' }}>
                                <MapContainer
                                    center={currentPosition || [40.7128, -74.0060]}
                                    zoom={15}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <MapClickHandler />
                                    <MapUpdater position={currentPosition} />

                                    {currentPosition && (
                                        <Marker
                                            position={currentPosition}
                                            icon={currentLocationIcon}
                                        />
                                    )}

                                    {routePositions.length > 1 && (
                                        <Polyline
                                            positions={routePositions}
                                            color="blue"
                                            weight={3}
                                        />
                                    )}
                                </MapContainer>
                            </div>

                            <p className="mb-2">
                                {!currentPosition ?
                                    (trackingMode === 'real-gps' ?
                                        'Click "Get My Location" to start with your current GPS position.' :
                                        'Click on the map to set your starting position.') :
                                    isTracking ?
                                        `Currently tracking: ${totalDistance.toFixed(2)} km traveled` :
                                        'Ready to track steps. Press Start to begin.'
                                }
                            </p>

                            {trackingMode === 'gps' && (
                                <div className="d-flex gap-3 mb-3">
                                    <div className="flex-grow-1">
                                        <label htmlFor="simSpeed" className="form-label">Simulation Speed: {simulateSpeed} km/h</label>
                                        <input
                                            type="range"
                                            className="form-range"
                                            id="simSpeed"
                                            min="1"
                                            max="20"
                                            value={simulateSpeed}
                                            onChange={e => setSimulateSpeed(Number(e.target.value))}
                                            disabled={isTracking}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="d-flex gap-3">
                                {!isTracking ? (
                                    <>
                                        <button
                                            className="btn btn-success flex-grow-1"
                                            onClick={startTracking}
                                            disabled={!currentPosition}
                                        >
                                            <i className="fas fa-play me-2"></i>
                                            Start Tracking
                                        </button>

                                        {trackingMode === 'real-gps' && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={getUserLocation}
                                            >
                                                <i className="fas fa-location-arrow me-2"></i>
                                                Get My Location
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        className="btn btn-danger flex-grow-1"
                                        onClick={stopTracking}
                                    >
                                        <i className="fas fa-stop me-2"></i>
                                        Stop Tracking
                                    </button>
                                )}
                            </div>

                            <div className="mt-3">
                                <small className="text-muted">
                                    {trackingMode === 'real-gps' ?
                                        'Using your device\'s real GPS location. Steps will be calculated based on actual movement.' :
                                        'This is a simulation of GPS tracking. In a real app, this would use your device\'s actual GPS.'}
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="info-card mb-4">
                <div className="card">
                    <div className="card-header bg-info text-white">
                        <h5 className="mb-0">Points & Rewards</h5>
                    </div>
                    <div className="card-body">
                        <p>You currently have <strong>{points} points</strong>.</p>
                        <p>Visit the <strong>Redeem Rewards</strong> page to exchange your points for ETH rewards!</p>
                        <ul className="list-group">
                            {pointThresholds.map((threshold, index) => (
                                <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>{threshold.reward}</span>
                                    <span className={`badge ${points >= threshold.points ? 'bg-success' : 'bg-secondary'}`}>
                                        {threshold.points} points
                                        {points >= threshold.points && " (Available)"}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            <div className="text-center mt-4">
                <button className="btn btn-sm btn-outline-danger" onClick={resetProgress}>
                    Reset Progress
                </button>
            </div>
        </div>
    );
}

export default StepTracker;