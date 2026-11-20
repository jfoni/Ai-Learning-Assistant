import express from 'express';
import { getDashboardOverview } from '../controllers/dashboardController.js';

const router = express.Router();

// Support both /api/dashboard/overview?userId=... and /api/dashboard/:userId
router.get('/overview', getDashboardOverview);
router.get('/:userId', getDashboardOverview);

export default router;