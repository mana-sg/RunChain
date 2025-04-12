// models/StepLog.js
import { DataTypes } from 'sequelize';

const StepLog = (sequelize) => {
  return sequelize.define('StepLog', {
    logId: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    userId: { 
      type: DataTypes.STRING, 
      allowNull: false,
      references: {
        model: 'users',        // References the users table
        key: 'userId'          // References the userId field
      }
    },
    date: { 
      type: DataTypes.DATEONLY, 
      allowNull: false,
      defaultValue: DataTypes.NOW 
    },
    count: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      validate: {
        min: 1,               // Minimum 1 step per log
        max: 50000            // Prevent unrealistic single entries
      }
    }
  }, {
    tableName: 'step_logs',
    timestamps: true          // Adds createdAt/updatedAt
  });
};

export default StepLog;