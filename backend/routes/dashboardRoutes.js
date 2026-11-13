import express from 'express';
import { getDashboardOverview } from '../controllers/dashboardController.js';

const router = express.Router();

// Get dashboard overview stats
router.get('/overview', getDashboardOverview);

export default router;