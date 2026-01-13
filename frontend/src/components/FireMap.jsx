import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom fire marker icon
const fireIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Component to re-center map when locations change or when a location is selected
const MapUpdater = ({ locations, selectedLocation }) => {
    const map = useMap();

    useEffect(() => {
        if (selectedLocation && selectedLocation.latitude && selectedLocation.longitude) {
            // Zoom to selected location
            map.setView([selectedLocation.latitude, selectedLocation.longitude], 17, {
                animate: true,
                duration: 0.5
            });
        } else if (locations && locations.length > 0) {
            const latestLocation = locations[0];
            if (latestLocation.latitude && latestLocation.longitude) {
                map.setView([latestLocation.latitude, latestLocation.longitude], 15);
            }
        }
    }, [locations, selectedLocation, map]);

    return null;
};

const FireMap = ({ locations = [], height = '400px', selectedLocation = null }) => {
    // Default center (Indonesia - Jakarta)
    const defaultCenter = [-6.200000, 106.816666];
    const defaultZoom = 5;

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('id-ID');
    };

    return (
        <div className="rounded-2xl overflow-hidden border border-slate-700/50" style={{ height }}>
            <MapContainer
                center={defaultCenter}
                zoom={defaultZoom}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater locations={locations} selectedLocation={selectedLocation} />

                {locations.map((location) => (
                    location.latitude && location.longitude && (
                        <Marker
                            key={location.id}
                            position={[location.latitude, location.longitude]}
                            icon={fireIcon}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-bold text-red-600 mb-2">🔥 FIRE DETECTED</div>
                                    <div><strong>User:</strong> {location.username || 'Anonymous'}</div>
                                    <div><strong>Time:</strong> {formatDate(location.createdAt)}</div>
                                    {location.address && (
                                        <div><strong>Address:</strong> {location.address}</div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
};

export default FireMap;
