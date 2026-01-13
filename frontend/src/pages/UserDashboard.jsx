import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import StatusIndicator from '../components/StatusIndicator';
import api from '../services/api';

const SOCKET_URL = `http://${window.location.hostname}:5000`;

const UserDashboard = () => {
    const [status, setStatus] = useState('SAFE');
    const [lastUpdate, setLastUpdate] = useState(null);
    const [connected, setConnected] = useState(false);
    const [locationStatus, setLocationStatus] = useState('idle'); // idle, sending, sent, error
    const [userLocation, setUserLocation] = useState(null);
    const [myLogs, setMyLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(true);
    const audioRef = useRef(null);
    const socketRef = useRef(null);

    // Get user's current location
    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    };

    // Reverse geocode to get address from coordinates
    const getAddressFromCoordinates = async (latitude, longitude) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                {
                    headers: {
                        'Accept-Language': 'id', // Indonesian language
                        'User-Agent': 'FireDetectionApp/1.0'
                    }
                }
            );
            const data = await response.json();
            return data.display_name || null;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return null;
        }
    };

    // Send location to server when fire detected
    const sendLocationToServer = async (logId) => {
        try {
            setLocationStatus('sending');
            const location = await getCurrentLocation();
            setUserLocation(location);

            // Get address from coordinates
            const address = await getAddressFromCoordinates(location.latitude, location.longitude);

            // api service already includes auth token via interceptor
            await api.post('/sensor/location', {
                logId,
                latitude: location.latitude,
                longitude: location.longitude,
                address: address
            });

            setLocationStatus('sent');
            console.log('📍 Location sent to server:', location, 'Address:', address);
        } catch (error) {
            console.error('Failed to send location:', error);
            setLocationStatus('error');
        }
    };

    useEffect(() => {
        // Fetch initial status
        const fetchInitialStatus = async () => {
            try {
                const response = await api.get('/sensor/status');
                setStatus(response.data.status);
                if (response.data.timestamp) {
                    setLastUpdate(new Date(response.data.timestamp));
                }
            } catch (error) {
                console.error('Failed to fetch initial status:', error);
            }
        };

        // Fetch user's logs
        const fetchMyLogs = async () => {
            try {
                setLogsLoading(true);
                const response = await api.get('/logs/my');
                setMyLogs(response.data);
            } catch (error) {
                console.error('Failed to fetch my logs:', error);
            } finally {
                setLogsLoading(false);
            }
        };

        fetchInitialStatus();
        fetchMyLogs();

        // Connect to Socket.io
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            console.log('Connected to Socket.io');
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            console.log('Disconnected from Socket.io');
            setConnected(false);
        });

        socketRef.current.on('fire-alert', (data) => {
            console.log('Received fire alert:', data);
            setStatus(data.status);
            setLastUpdate(new Date(data.timestamp));

            // Play alarm sound and send location if FIRE
            if (data.status === 'FIRE') {
                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.log('Audio play failed:', e));
                }
                // Send location to server with logId
                sendLocationToServer(data.logId);
            } else {
                // SAFE - stop alarm automatically
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
                setLocationStatus('idle');
            }
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hidden audio element for alarm */}
            <audio ref={audioRef} loop>
                <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
            </audio>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Connection Status */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-slate-400">
                        {connected ? 'Connected to server' : 'Disconnected'}
                    </span>
                </div>

                {/* Main Status Card */}
                <div className="glass-card rounded-3xl p-12 flex flex-col items-center relative overflow-hidden">
                    <StatusIndicator status={status} />

                    {/* Location Status */}
                    {status === 'FIRE' && (
                        <div className="mt-6 text-center">
                            {locationStatus === 'sending' && (
                                <div className="flex items-center gap-2 text-yellow-400">
                                    <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                                    <span>Sending your location...</span>
                                </div>
                            )}
                            {locationStatus === 'sent' && userLocation && (
                                <div className="text-green-400">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span>Location sent to emergency services</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        📍 {userLocation.latitude.toFixed(6)}, {userLocation.longitude.toFixed(6)}
                                    </div>
                                </div>
                            )}
                            {locationStatus === 'error' && (
                                <div className="text-red-400">
                                    <span>⚠️ Could not get your location. Please enable location access.</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Last Update */}
                    {lastUpdate && (
                        <div className="mt-8 text-center text-slate-400 text-sm">
                            Last update: {lastUpdate.toLocaleString()}
                        </div>
                    )}
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Real-time Monitoring</h3>
                                <p className="text-sm text-slate-400">24/7 fire detection</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">Auto Location</h3>
                                <p className="text-sm text-slate-400">GPS tracking on fire</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-semibold text-white">IoT Powered</h3>
                                <p className="text-sm text-slate-400">ESP32 integration</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stop Alarm Button (when fire) */}
                {status === 'FIRE' && (
                    <div className="mt-8 text-center">
                        <button
                            onClick={() => audioRef.current?.pause()}
                            className="btn-secondary"
                        >
                            Stop Alarm Sound
                        </button>
                    </div>
                )}

                {/* My Fire Logs Section */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        My Fire Logs
                    </h2>

                    <div className="glass-card rounded-2xl overflow-hidden">
                        {logsLoading ? (
                            <div className="p-8 text-center">
                                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                <p className="text-slate-400">Loading your logs...</p>
                            </div>
                        ) : myLogs.length === 0 ? (
                            <div className="p-8 text-center">
                                <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-slate-400">No fire logs yet</p>
                                <p className="text-sm text-slate-500 mt-1">Your fire detection history will appear here</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-800/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700/50">
                                        {myLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${log.status === 'FIRE'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {log.status === 'FIRE' ? '🔥' : '✅'} {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                                                    {log.latitude && log.longitude
                                                        ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}`
                                                        : '-'
                                                    }
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-300 max-w-xs truncate">
                                                    {log.address || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UserDashboard;
