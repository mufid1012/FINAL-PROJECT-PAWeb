const express = require('express');
const router = express.Router();
const { getLogs, getMyLogs } = require('../controllers/logController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// User route - get own logs only
router.get('/my', auth, getMyLogs);

// Admin only route - get all logs
router.get('/', auth, roleCheck('admin'), getLogs);

module.exports = router;

