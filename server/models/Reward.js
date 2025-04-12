import { DataTypes } from 'sequelize';

const Reward = (sequelize) => {
  return sequelize.define('Reward', {
    rewardId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: 'users',  // References the users table
        key: 'userId'    // References the userId field
      }
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),  // Precision for financial data
      allowNull: false,
      validate: {
        min: 0  // Ensure rewards can't be negative
      }
    },
    dateEarned: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW  // Automatic timestamp
    },
    txHash: {
      type: DataTypes.STRING(66),  // Fixed length for Ethereum hashes
      allowNull: true,
      unique: true
    }
  }, {
    timestamps: false,
    tableName: 'rewards',
    indexes: [
      {
        fields: ['userId']  // Index for frequent user reward queries
      },
      {
        fields: ['dateEarned']  // Index for time-based queries
      }
    ]
  });
};

export default Reward;