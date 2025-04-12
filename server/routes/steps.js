import express from 'express';

const router = express.Router();

// Example route for posting steps
router.post('/record', (req, res) => {
  const { userId, steps } = req.body;
  console.log(`User ${userId} submitted ${steps} steps`);
  // Placeholder: reward logic goes here

  res.json({ message: 'Steps recorded successfully!' });
});

export default router;
