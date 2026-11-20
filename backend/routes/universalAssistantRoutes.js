import express from 'express';
import { askUniversalAssistantController } from '../controllers/universalAssistantController.js';

const router = express.Router();

router.post('/ask', askUniversalAssistantController);

export default router;