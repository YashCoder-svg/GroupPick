import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';

import authRoutes from './routes/auth.routes.js';
import groupsRoutes from './routes/groups.routes.js';
import packsRoutes from './routes/packs.routes.js';
import placesRoutes from './routes/places.routes.js';
import destinationsRoutes from './routes/destinations.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers with Swagger & Map compatibility
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'", 'http://localhost:*', 'ws://localhost:*', 'https://nominatim.openstreetmap.org', 'https://photon.komoot.io'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly permissive CORS
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-member-token', 'x-organizer-token'],
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to /api
app.use('/api', apiLimiter);

// Load OpenAPI Specification
const openApiPath = path.resolve(__dirname, './docs/openapi.json');
let swaggerSpec = {};
if (fs.existsSync(openApiPath)) {
  swaggerSpec = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
}

// Swagger UI Documentation at /api/docs
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'GroupPick API Documentation',
  })
);

// OpenAPI JSON raw endpoint
app.get('/api/docs.json', (req, res) => {
  res.json(swaggerSpec);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'GroupPick API',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/packs', packsRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/destinations', destinationsRoutes);

// Decision confirm shortcut route (matches spec POST /api/decisions/:id/confirm)
app.post('/api/decisions/:decisionId/confirm', async (req, res, next) => {
  // Delegate to groups router confirm handler
  req.url = `/decisions/${req.params.decisionId}/confirm`;
  return groupsRoutes(req, res, next);
});

// Error handling middleware
app.use(errorHandler);

export default app;
