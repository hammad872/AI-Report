const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const cors = require('cors');// allows *
require('dotenv').config();
const db = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const reportRoutes = require('./routes/report.routes');
const exerciseRoutes = require('./routes/exercise.routes');
const Exercise = require('./models/Exercise.model');
const exercises = require('./seed/exercises.json');

const app = express();
app.use(cors()); 
// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
db();

// Auto-seed exercises on startup
const seedExercises = async () => {
  try {
    const count = await Exercise.countDocuments();
    if (count === 0) {
      await Exercise.insertMany(exercises);
      console.log(`✓ Auto-seeded ${exercises.length} exercises`);
    }
  } catch (error) {
    console.error('Auto-seed failed:', error.message);
  }
};

setTimeout(seedExercises, 1000);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', auth);
app.use('/api/report', reportRoutes);
app.use('/api/exercises', exerciseRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PeakPerformance backend running on port ${PORT}`);
  console.log(`AI Provider: ${process.env.AI_PROVIDER}`);
});

module.exports = app;
