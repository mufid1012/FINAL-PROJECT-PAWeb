require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { sequelize, connectDB } = require('./config/database');
const { User, SensorLog } = require('./models');
const { updateStatus, updateLocation } = require('./controllers/sensorController');

// Import routes
const authRoutes = require('./routes/authRoutes');
const sensorRoutes = require('./routes/sensorRoutes');
const logRoutes = require('./routes/logRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS - allow all origins for development
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false
    }
});

// Middleware - allow all origins for development
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sensor', sensorRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/users', userRoutes);

// Sensor update endpoint (public for ESP32)
app.post('/api/sensor/update', (req, res) => {
    updateStatus(req, res, io);
});

// Location update endpoint (requires auth for user info)
app.post('/api/sensor/location', (req, res) => {
    // Optional auth - extract user if token provided
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token invalid, continue without user
            req.user = null;
        }
    }
    updateLocation(req, res, io);
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Fire Detection API is running' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Create default admin user
const createDefaultAdmin = async () => {
    try {
        const adminExists = await User.findOne({ where: { email: 'admin@fire.com' } });

        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            await User.create({
                username: 'Admin',
                email: 'admin@fire.com',
                password: hashedPassword,
                role: 'admin'
            });

            console.log('👤 Default admin created: admin@fire.com / admin123');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
};

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Sync database (create tables if not exist)
        await sequelize.sync({ alter: true });
        console.log('📊 Database tables synced');

        // Create default admin
        await createDefaultAdmin();

        // Start listening
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
            console.log(`📡 Socket.io ready for connections`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
