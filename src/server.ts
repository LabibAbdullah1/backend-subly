import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './config/db.js';
import authRoutes from './api/routes/authRoutes.js';
import { authenticateJWT, AuthenticatedRequest } from './middleware/authMiddleware.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Basic welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Subly JS Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Protected route to get authenticated user details
app.get('/api/auth/me', authenticateJWT, (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    status: 'success',
    user: {
      id: req.user?.id.toString(), // Convert BigInt to string for JSON serialization
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role
    }
  });
});

// Health check and Database Connection check route
app.get('/api/health', async (req, res) => {
  try {
    // Run simple query to check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'success',
      message: 'Server is healthy and database is connected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

