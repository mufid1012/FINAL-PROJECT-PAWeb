const express = require('express');
const router = express.Router();
const { getLogs } = require('../controllers/logController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Admin only route
router.get('/', auth, roleCheck('admin'), getLogs);

module.exports = router;
