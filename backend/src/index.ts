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

// Allowed origins
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://www.typeblitz.app',
  'https://typeblitz.app',
];

const envOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = Array.from(new Set([...defaultAllowedOrigins, ...envOrigins]));

// CORS configuration supporting custom domains, Vercel preview URLs, and localhost
// (In Express 5, app.use(cors(...)) handles both regular and OPTIONS preflight requests)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const isExplicitlyAllowed = allowedOrigins.includes(origin);
      const isTypeblitzDomain = /^https:\/\/(www\.)?typeblitz\.app$/.test(origin);
      const isVercelDomain = /^https:\/\/[a-zA-Z0-9_-]+(\.vercel\.app)$/.test(origin);
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

      if (isExplicitlyAllowed || isTypeblitzDomain || isVercelDomain || isLocalhost) {
        return callback(null, true);
      }

      console.warn(`Blocked by CORS: origin ${origin} is not allowed.`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Mount Routes
app.use('/api/results', resultRoutes);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', message: 'Typeblitz backend is running.' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
