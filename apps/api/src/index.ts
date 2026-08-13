import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import adminRoutes from './routes/admin.js';
import activationRoutes from './routes/activation.js';
import publicRoutes from './routes/public.js';
import sellerRoutes from './routes/seller.js';
import reviewRoutes from './routes/reviews.js';

// Fail fast in production without JWT_SECRET
if (process.env.NODE_ENV === 'production') {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32 || s === 'dev-secret-change-me') {
    console.error('FATAL: Set a strong JWT_SECRET (32+ characters) in production');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Required behind Render/nginx so rate-limit and req.ip work correctly
app.set('trust proxy', 1);

const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173,http://127.0.0.1:5173';
const allowedOrigins = frontendUrl.split(',').map((s) => s.trim()).filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global baseline limiter (stricter limiters on auth/tap/review/activate)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'patana-api', timestamp: new Date().toISOString() });
});

app.get('/api/v1', (_req, res) => {
  res.json({ message: 'Patana API v1', version: '1.0.1' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/activate', activationRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/seller', sellerRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (err instanceof Error && err.message.includes('Only JPEG')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large (max 5MB)' });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Patana API on :${PORT}`);
});
