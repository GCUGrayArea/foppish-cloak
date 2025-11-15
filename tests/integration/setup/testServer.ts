/**
 * Test Server Setup
 *
 * Provides Express app instance configured for testing with
 * all routes and middleware properly initialized.
 */

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import authRouter from '../../../services/api/src/routes/auth';
import userRouter from '../../../services/api/src/routes/users';
import firmRouter from '../../../services/api/src/routes/firms';
import templateRouter from '../../../services/api/src/routes/templates';
import documentRouter from '../../../services/api/src/routes/documents';
import demandLetterRouter from '../../../services/api/src/routes/demand-letters';
// import exportRouter from '../../../services/api/src/routes/export';  // TODO: Add when export route exists
import { errorHandler } from '../../../services/api/src/middleware/errorHandler';

let testApp: Express | null = null;

/**
 * Create and configure Express app for testing
 */
export function createTestServer(): Express {
  if (testApp) {
    return testApp;
  }

  const app = express();

  // Basic middleware
  app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for tests
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', environment: 'test' });
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', userRouter);
  app.use('/api/firms', firmRouter);
  app.use('/api/templates', templateRouter);
  app.use('/api/documents', documentRouter);
  app.use('/api/demand-letters', demandLetterRouter);
  // app.use('/api/export', exportRouter);  // TODO: Add when export route exists

  // Error handler (must be last)
  app.use(errorHandler);

  testApp = app;
  return app;
}

/**
 * Get existing test server instance or create new one
 */
export function getTestServer(): Express {
  if (!testApp) {
    return createTestServer();
  }
  return testApp;
}

/**
 * Reset test server instance
 * Useful for tests that need a fresh server
 */
export function resetTestServer(): void {
  testApp = null;
}
