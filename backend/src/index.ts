import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';

import resultRoutes from './routes/resultRoutes';

// Load env vars
dotenv.config();

// Connect to databases
connectDB();
connectRedis();

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// Mount Routes
app.use('/api/results', resultRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Typeblitz backend is running.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
