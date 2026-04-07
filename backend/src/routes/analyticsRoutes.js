import express from 'express';
import { getInsights, refreshInsights } from '../controllers/analyticsController.js';

const router = express.Router();

// GET /api/analytics/insights?user_id=<uuid>
// Returns all social accounts + latest insights for the given user
router.get('/insights', getInsights);

// POST /api/analytics/refresh/:accountId
// Manually triggers a Meta API refresh for a specific social account
router.post('/refresh/:accountId', refreshInsights);

export default router;
