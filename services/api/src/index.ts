import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import firmRoutes from './routes/firms';
import userRoutes from './routes/users';
import documentRoutes from './routes/documents';
import templateRoutes from './routes/templates';
import demandLetterRoutes from './routes/demand-letters';
import { authenticate } from './middleware/auth';
import { enforceFirmContext } from './middleware/firmContext';
import { securityHeaders, permissionsPolicy } from './middleware/security';
import { corsConfig } from './config/cors';
import { rateLimiter } from './middleware/rateLimit';
import { validateApiKey } from './middleware/apiKey';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Security Middleware (applied first)
app.use(securityHeaders);
app.use(permissionsPolicy);
app.use(cors(corsConfig));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting middleware (applied globally)
app.use(rateLimiter);

// API Key validation (optional, before JWT auth)
app.use(validateApiKey);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/firms', authenticate, enforceFirmContext, firmRoutes);
app.use('/users', authenticate, enforceFirmContext, userRoutes);
app.use('/documents', authenticate, enforceFirmContext, documentRoutes);
app.use('/demand-letters', authenticate, enforceFirmContext, demandLetterRoutes);
app.use('/templates', authenticate, enforceFirmContext, templateRoutes);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on port ${PORT}`);
  });
}

export default app;
