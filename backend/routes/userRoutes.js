const express = require('express');
const router = express.Router();
const { getUsers } = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Admin only route
router.get('/', auth, roleCheck('admin'), getUsers);

module.exports = router;
