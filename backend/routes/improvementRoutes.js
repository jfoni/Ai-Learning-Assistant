import express from 'express';
import { getUserImprovementData } from '../controllers/improvementController.js';

const router = express.Router();

router.get('/:userId', getUserImprovementData);

export default router;