import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import prisma from './config/db.js';
import { AuthenticatedRequest, authenticateJWT } from './middleware/authMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import planRoutes from './routes/planRoutes.js';
import voucherRoutes from './routes/voucherRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import subdomainRoutes from './routes/subdomainRoutes.js';
import deploymentRoutes from './routes/deploymentRoutes.js';
import envRoutes from './routes/envRoutes.js';
import fileManagerRoutes from './routes/fileManagerRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingRoutes from './routes/settingRoutes.js';
import logRoutes from './routes/logRoutes.js';
import testimonialRoutes from './routes/testimonialRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { getUploadsPath } from './utils/path.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve folder uploads secara statis agar bukti transfer bisa diakses/diunduh
app.use('/uploads', express.static(getUploadsPath()));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', planRoutes);
app.use('/api', voucherRoutes);
app.use('/api', paymentRoutes);
app.use('/api', subdomainRoutes);
app.use('/api', deploymentRoutes);
app.use('/api', envRoutes);
app.use('/api', fileManagerRoutes);
app.use('/api', chatRoutes);
app.use('/api', reportRoutes);
app.use('/api', settingRoutes);
app.use('/api', logRoutes);
app.use('/api', testimonialRoutes);
app.use('/api', notificationRoutes);

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

// Global Error Handler Middleware (Ensure all errors return JSON instead of HTML)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error Handler]:', err.message);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Terjadi kesalahan internal server.'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
