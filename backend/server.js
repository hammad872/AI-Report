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
const seedAdminUser = require('./seed/seedAdmin');

const app = express();

// Middleware
// FRONTEND_URL can be a single origin or a comma-separated list
// (e.g. "https://ai-report-flax.vercel.app,http://localhost:3000").
// Trailing slashes are stripped because the browser's Origin header
// never includes one — a mismatch here is a silent CORS failure.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''));

app.use(cors({
  origin: function (origin, callback) {
    // allow tools with no origin (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
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
setTimeout(seedAdminUser, 1500);

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