const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SensorLog = sequelize.define('SensorLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    latitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    longitude: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    address: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    username: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'sensor_logs',
    timestamps: true,
    updatedAt: false
});

module.exports = SensorLog;
