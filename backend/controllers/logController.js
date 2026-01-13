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

module.exports = { getLogs };
