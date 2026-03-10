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
app.use(cors());
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
