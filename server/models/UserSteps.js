// This file records all steps cumulatively for each user. It is used to track the current step count and the last reward threshold reached by the user.
import { DataTypes } from 'sequelize';

const UserSteps = (sequelize) => {
    return sequelize.define('UserSteps', {
      userId: { 
        type: DataTypes.STRING, 
        primaryKey: true,
        references: { model: 'users', key: 'userId' }
      },
      currentCount: { 
        type: DataTypes.INTEGER, 
        defaultValue: 0,
        allowNull: false 
      },
      lastRewardThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
    }, {
      tableName: 'user_steps'
    });
  };


export default UserSteps;