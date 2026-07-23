require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const { initPgDatabase } = require('./db/connection');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));

app.use(express.json());

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/scans', scanRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Lunar Security REST API Engine',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, async () => {
  console.log(`🚀 Lunar REST API Server running on port ${PORT}`);
  // Initialize PostgreSQL Pool
  await initPgDatabase();
});
