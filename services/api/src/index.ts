import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import firmRoutes from './routes/firms';
import userRoutes from './routes/users';
import documentRoutes from './routes/documents';
import templateRoutes from './routes/templates';
import { authenticate } from './middleware/auth';
import { enforceFirmContext } from './middleware/firmContext';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/firms', authenticate, enforceFirmContext, firmRoutes);
app.use('/users', authenticate, enforceFirmContext, userRoutes);
app.use('/documents', authenticate, enforceFirmContext, documentRoutes);
app.use('/templates', authenticate, enforceFirmContext, templateRoutes);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API server listening on port ${PORT}`);
  });
}

export default app;
