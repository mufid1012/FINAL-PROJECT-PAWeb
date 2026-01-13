const { SensorLog } = require('../models');

// Store current status in memory for quick access
let currentStatus = 'SAFE';
let lastStatusUpdate = new Date();

// Update sensor status (called by ESP32)
const updateStatus = async (req, res, io) => {
    try {
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required.' });
        }

        const normalizedStatus = status.toUpperCase();

        if (!['FIRE', 'SAFE'].includes(normalizedStatus)) {
            return res.status(400).json({ message: 'Status must be either FIRE or SAFE.' });
        }

        // Update current status in memory
        currentStatus = normalizedStatus;
        lastStatusUpdate = new Date();

        // Create log entry for FIRE status (without location initially)
        let logEntry = null;
        if (normalizedStatus === 'FIRE') {
            logEntry = await SensorLog.create({ status: normalizedStatus });
        }

        // Emit realtime event to all connected clients
        io.emit('fire-alert', {
            status: normalizedStatus,
            timestamp: lastStatusUpdate.toISOString(),
            logId: logEntry ? logEntry.id : null
        });

        console.log(`📡 Sensor update: ${normalizedStatus}`);

        res.json({
            message: 'Status updated successfully.',
            status: normalizedStatus,
            logId: logEntry ? logEntry.id : null
        });
    } catch (error) {
        console.error('Sensor update error:', error);
        res.status(500).json({ message: 'Server error during sensor update.' });
    }
};

// Update location for a fire event (called by user browser)
const updateLocation = async (req, res, io) => {
    try {
        const { logId, latitude, longitude, address } = req.body;
        const user = req.user; // From auth middleware

        console.log('📍 Location update request - User:', user);

        if (!latitude || !longitude) {
            return res.status(400).json({ message: 'Latitude and longitude are required.' });
        }

        let logEntry;

        if (logId) {
            // Update existing log entry with location
            logEntry = await SensorLog.findByPk(logId);
            if (logEntry) {
                await logEntry.update({
                    latitude,
                    longitude,
                    address: address || null,
                    userId: user ? user.id : null,
                    username: user ? user.username : 'Anonymous'
                });
            }
        } else {
            // Create new log entry with location (for manual fire reports)
            logEntry = await SensorLog.create({
                status: 'FIRE',
                latitude,
                longitude,
                address: address || null,
                userId: user ? user.id : null,
                username: user ? user.username : 'Anonymous'
            });
        }

        // Emit fire location to admin dashboard
        io.emit('fire-location', {
            id: logEntry.id,
            latitude,
            longitude,
            address: address || null,
            username: user ? user.username : 'Anonymous',
            timestamp: logEntry.createdAt
        });

        console.log(`📍 Fire location received: ${latitude}, ${longitude} from ${user ? user.username : 'Anonymous'}`);

        res.json({
            message: 'Location updated successfully.',
            location: {
                latitude,
                longitude,
                address
            }
        });
    } catch (error) {
        console.error('Location update error:', error);
        res.status(500).json({ message: 'Server error during location update.' });
    }
};

// Get all fire locations for admin map
const getFireLocations = async (req, res) => {
    try {
        const fireEvents = await SensorLog.findAll({
            where: { status: 'FIRE' },
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        // Filter only events with location
        const eventsWithLocation = fireEvents.filter(e => e.latitude && e.longitude);

        res.json(eventsWithLocation);
    } catch (error) {
        console.error('Get fire locations error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get current status (for initial load) - uses in-memory status
const getCurrentStatus = async (req, res) => {
    try {
        // Return current in-memory status (more accurate than DB)
        res.json({
            status: currentStatus,
            timestamp: lastStatusUpdate.toISOString()
        });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

module.exports = { updateStatus, updateLocation, getFireLocations, getCurrentStatus };
