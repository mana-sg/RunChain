import { DataTypes } from 'sequelize';

const User = (sequelize) => {
  return sequelize.define('User', {
    userId: {
      type: DataTypes.STRING,      // Serves as both blockchain ID and display handle
      primaryKey: true,
      allowNull: false,
      validate: {
        is: /^[a-z0-9_]{3,20}$/i  // Enforces readable format (e.g. "john_doe")
      }
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    publicCertificate: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    // Corrected part of model definition
    email: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true
      }
    },
    publicCertificate: { // Only ONE definition
      type: DataTypes.TEXT,
      allowNull: false
      // unique: true // Reconsider if uniqueness is needed here vs just on userId/email
    }
  }, {
    timestamps: true,  // Adds createdAt/updatedAt automatically
    tableName: 'users',
    indexes: [
      {
        unique: true,
        fields: ['userId']  // Ensures no duplicate handles
      }
    ],
    hooks: {
      beforeValidate: (user) => {
        if (user.email) {
          user.email = user.email.toLowerCase(); // Normalize email case
        }
      }
    }
  });
};

export default User;