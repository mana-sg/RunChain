import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { sequelize } from './models/index.js';

import authenticateToken from './middleware/authenticateToken.js'; // Import the auth middleware
import stepsRoutes from './routes/steps.js';
import registerRoute from './routes/register.js';
import loginChallengeRoute from './routes/loginChallenge.js';
import verifyRoute from './routes/verifyLogin.js';
import profileRouter from './routes/profile.js';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database Initialization
const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');

    await sequelize.sync({
      alter: process.env.NODE_ENV === 'development',
      force: false
    });
    console.log('🔄 Database models synchronized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/steps', stepsRoutes);
app.use('/api/register', registerRoute);
app.use('/api/login-challenge', loginChallengeRoute);
app.use('/api/verify-login', verifyRoute);

// Protected Routes
app.use('/api/user', authenticateToken, profileRouter);

// Root route
app.get('/', (req, res) => {
  res.send(`
    <h1>Welcome to the StepUp API!</h1>
    <p>Available endpoints:</p>
    <ul>
      <li><a href="/api/health">/api/health</a> - System health check</li>
      <li>/api/register - User registration</li>
      <li>/api/steps - Step tracking</li>
      <li>/api/login-challenge - Get login challenge</li>
    </ul>
  `);
});

// Error handler
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
