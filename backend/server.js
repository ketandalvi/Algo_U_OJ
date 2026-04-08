import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import problemRoutes from './routes/problemRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middleware/errorMiddleware.js';


dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.get('/', (_req, res) => {
  res.json({ message: 'Coding Judge API is running! 🚀' });
});
app.use('/api/problems', problemRoutes);
app.use('/api/auth', authRoutes);
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI, {
    tls: true,
    tlsAllowInvalidCertificates: false,
  })
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
  });

// Graceful shutdown — important when execution engine is running
const shutdown = async () => {
  console.log('⏳ Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);