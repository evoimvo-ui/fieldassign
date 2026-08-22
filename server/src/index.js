import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import activityRoutes from './routes/activities.js';
import reportRoutes from './routes/reports.js';
import userRoutes from './routes/users.js';
import webhookRoutes from './routes/webhooks.js';
import { authenticate } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Webhook route mora biti prije express.json() — Paddle šalje raw body
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

// Public routes
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/activities', authenticate, activityRoutes);
app.use('/api/reports', authenticate, reportRoutes);
app.use('/api/users', authenticate, userRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
