const express = require('express');
const router = express.Router();
const { getUsers, updateUser, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Admin only routes
router.get('/', auth, roleCheck('admin'), getUsers);
router.put('/:id', auth, roleCheck('admin'), updateUser);
router.delete('/:id', auth, roleCheck('admin'), deleteUser);

module.exports = router;

