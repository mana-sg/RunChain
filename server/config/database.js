import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Add connection debugging
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log, // Enable query logging
    dialectOptions: {
      connectTimeout: 60000 // Increase timeout if needed
    },
    retry: {
      max: 5, // Maximum retry attempts
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /ER_ACCESS_DENIED_ERROR/,
      ]
    }
  }
);

// Test connection with verbose output
sequelize.authenticate()
  .then(() => console.log('✅ Database connection established successfully'))
  .catch(error => {
    console.error('❌ Database connection error:', error);
    console.log('Current connection config:', {
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT
    });
    process.exit(1);
  });

export default sequelize;