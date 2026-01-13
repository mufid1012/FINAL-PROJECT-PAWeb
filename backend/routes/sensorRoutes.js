const express = require('express');
const router = express.Router();
const { getCurrentStatus, getFireLocations } = require('../controllers/sensorController');
const auth = require('../middleware/auth');

// Public route - get current status
router.get('/status', getCurrentStatus);

// Protected route - get fire locations for admin map
router.get('/fire-locations', auth, getFireLocations);

module.exports = router;
