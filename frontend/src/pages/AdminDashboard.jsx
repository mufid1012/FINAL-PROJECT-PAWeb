import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Navbar from '../components/Navbar';
import StatusIndicator from '../components/StatusIndicator';
import FireMap from '../components/FireMap';
import api from '../services/api';

const SOCKET_URL = `http://${window.location.hostname}:5000`;

const AdminDashboard = () => {
    const [status, setStatus] = useState('SAFE');
    const [logs, setLogs] = useState([]);
    const [users, setUsers] = useState([]);
    const [fireLocations, setFireLocations] = useState([]);
    const [connected, setConnected] = useState(false);
    const [activeTab, setActiveTab] = useState('status');
    const [loading, setLoading] = useState(true);
    const audioRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        // Fetch data
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const [statusRes, logsRes, usersRes, locationsRes] = await Promise.all([
                    api.get('/sensor/status'),
                    api.get('/logs'),
                    api.get('/users'),
                    api.get('/sensor/fire-locations', { headers })
                ]);

                setStatus(statusRes.data.status);
                setLogs(logsRes.data);
                setUsers(usersRes.data);
                setFireLocations(locationsRes.data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();

        // Connect to Socket.io
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket', 'polling']
        });

        socketRef.current.on('connect', () => {
            setConnected(true);
        });

        socketRef.current.on('disconnect', () => {
            setConnected(false);
        });

        socketRef.current.on('fire-alert', (data) => {
            setStatus(data.status);

            // Add to logs if FIRE
            if (data.status === 'FIRE') {
                setLogs(prev => [{
                    id: data.logId || Date.now(),
                    status: data.status,
                    createdAt: data.timestamp
                }, ...prev]);

                if (audioRef.current) {
                    audioRef.current.play().catch(e => console.log('Audio play failed:', e));
                }
            } else {
                // SAFE - stop alarm automatically
                if (audioRef.current) {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                }
            }
        });

        // Listen for fire location updates
        socketRef.current.on('fire-location', (data) => {
            console.log('Received fire location:', data);
            setFireLocations(prev => [data, ...prev]);
        });

        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="min-h-screen">
                <Navbar />
                <div className="flex items-center justify-center h-[80vh]">
                    <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <Navbar />

            {/* Hidden audio element for alarm */}
            <audio ref={audioRef} loop>
                <source src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3" type="audio/mpeg" />
            </audio>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                        <p className="mt-1 text-slate-400">Monitor fire detection system</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-slate-400">
                            {connected ? 'Connected' : 'Disconnected'}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    {['status', 'map', 'logs', 'users'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 rounded-xl font-medium transition-all ${activeTab === tab
                                ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
                                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50'
                                }`}
                        >
                            {tab === 'map' ? '🗺️ Map' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Status Tab */}
                {activeTab === 'status' && (
                    <div className="glass-card rounded-3xl p-12 flex flex-col items-center relative overflow-hidden">
                        <StatusIndicator status={status} />

                        {status === 'FIRE' && (
                            <button
                                onClick={() => audioRef.current?.pause()}
                                className="mt-8 btn-secondary"
                            >
                                Stop Alarm Sound
                            </button>
                        )}
                    </div>
                )}

                {/* Map Tab */}
                {activeTab === 'map' && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-700/50">
                            <h2 className="text-xl font-semibold text-white">🗺️ Fire Locations Map</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                Showing {fireLocations.filter(l => l.latitude && l.longitude).length} fire events with location data
                            </p>
                        </div>

                        <div className="p-4">
                            <FireMap locations={fireLocations} height="500px" />
                        </div>

                        {/* Recent Fire Locations List */}
                        {fireLocations.filter(l => l.latitude && l.longitude).length > 0 && (
                            <div className="p-6 border-t border-slate-700/50">
                                <h3 className="text-lg font-semibold text-white mb-4">Recent Fire Locations</h3>
                                <div className="space-y-3 max-h-60 overflow-y-auto">
                                    {fireLocations.filter(l => l.latitude && l.longitude).slice(0, 10).map((location) => (
                                        <div key={location.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                                    🔥
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{location.username || 'Anonymous'}</div>
                                                    <div className="text-xs text-slate-400">
                                                        {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-400">
                                                {formatDate(location.createdAt || location.timestamp)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-700/50">
                            <h2 className="text-xl font-semibold text-white">Sensor Logs</h2>
                            <p className="text-sm text-slate-400 mt-1">Fire detection history</p>
                        </div>

                        {logs.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p>No fire events recorded</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>ID</th>
                                            <th>Status</th>
                                            <th>Location</th>
                                            <th>User</th>
                                            <th>Timestamp</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="font-mono text-slate-300">#{log.id}</td>
                                                <td>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${log.status === 'FIRE'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : 'bg-green-500/20 text-green-400'
                                                        }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="text-slate-400 text-sm">
                                                    {log.latitude && log.longitude
                                                        ? `${log.latitude.toFixed(4)}, ${log.longitude.toFixed(4)}`
                                                        : '-'}
                                                </td>
                                                <td className="text-slate-400">{log.username || '-'}</td>
                                                <td className="text-slate-400">{formatDate(log.createdAt)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Users Tab */}
                {activeTab === 'users' && (
                    <div className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-slate-700/50">
                            <h2 className="text-xl font-semibold text-white">Registered Users</h2>
                            <p className="text-sm text-slate-400 mt-1">{users.length} users registered</p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Registered</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="font-mono text-slate-300">#{user.id}</td>
                                            <td className="text-white font-medium">{user.username}</td>
                                            <td className="text-slate-400">{user.email}</td>
                                            <td>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === 'admin'
                                                    ? 'bg-orange-500/20 text-orange-400'
                                                    : 'bg-slate-500/20 text-slate-400'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="text-slate-400">{formatDate(user.createdAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Total Fire Events</p>
                                <p className="text-3xl font-bold text-white mt-1">{logs.length}</p>
                            </div>
                            <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">With Location</p>
                                <p className="text-3xl font-bold text-white mt-1">
                                    {fireLocations.filter(l => l.latitude && l.longitude).length}
                                </p>
                            </div>
                            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Registered Users</p>
                                <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
                            </div>
                            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center">
                                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-slate-400 text-sm">Current Status</p>
                                <p className={`text-3xl font-bold mt-1 ${status === 'FIRE' ? 'text-red-500' : 'text-green-500'}`}>
                                    {status}
                                </p>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${status === 'FIRE' ? 'bg-red-500/20' : 'bg-green-500/20'
                                }`}>
                                {status === 'FIRE' ? (
                                    <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                ) : (
                                    <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
