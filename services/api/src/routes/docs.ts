/**
 * Documentation Routes
 *
 * Serves API documentation via Swagger UI
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /docs
 * Redirect to Swagger UI
 */
router.get('/', (req, res) => {
  res.redirect('/api/docs');
});

export default router;
