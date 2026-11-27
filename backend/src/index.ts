import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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

// Trust first proxy (Render, Cloudflare, etc.) to accurately detect HTTPS protocol
app.set('trust proxy', 1);

// Enforce HTTPS in production: redirect unencrypted HTTP connections to HTTPS
app.use((req, res, next) => {
  if (
    process.env.NODE_ENV === 'production' &&
    req.headers['x-forwarded-proto'] &&
    req.headers['x-forwarded-proto'] !== 'https'
  ) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Enable HSTS (Strict-Transport-Security: 2 years, includeSubDomains, preload) and security headers
app.use(
  helmet({
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true,
    },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Fallback explicit HSTS header on all responses (guaranteed for every API response)
app.use((_req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  next();
});

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
