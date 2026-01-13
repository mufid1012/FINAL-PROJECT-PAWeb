const { SensorLog } = require('../models');

// Get all sensor logs (Admin only)
const getLogs = async (req, res) => {
    try {
        const logs = await SensorLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100
        });

        res.json(logs);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ message: 'Server error while fetching logs.' });
    }
};

// Get logs for current user only
const getMyLogs = async (req, res) => {
    try {
        const userId = req.user.id;

        const logs = await SensorLog.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        res.json(logs);
    } catch (error) {
        console.error('Get my logs error:', error);
        res.status(500).json({ message: 'Server error while fetching your logs.' });
    }
};

module.exports = { getLogs, getMyLogs };

