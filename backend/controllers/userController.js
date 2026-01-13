const { User } = require('../models');
const bcrypt = require('bcryptjs');

// Get all users (Admin only)
const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'createdAt'],
            order: [['createdAt', 'DESC']]
        });

        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error while fetching users.' });
    }
};

// Update user (Admin only)
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role, password } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Check if email is already taken by another user
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already in use.' });
            }
        }

        // Build update object
        const updateData = {};
        if (username) updateData.username = username;
        if (email) updateData.email = email;
        if (role) updateData.role = role;
        if (password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(password, salt);
        }

        await user.update(updateData);

        res.json({
            message: 'User updated successfully.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ message: 'Server error while updating user.' });
    }
};

// Delete user (Admin only)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;

        // Prevent admin from deleting themselves
        if (parseInt(id) === adminId) {
            return res.status(400).json({ message: 'You cannot delete your own account.' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        await user.destroy();

        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: 'Server error while deleting user.' });
    }
};

module.exports = { getUsers, updateUser, deleteUser };

