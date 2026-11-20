import express from 'express';
import { analyzeKnowledgeGapsController } from '../controllers/knowledgeGapController.js';

const router = express.Router();

router.post('/analyze', analyzeKnowledgeGapsController);

export default router;