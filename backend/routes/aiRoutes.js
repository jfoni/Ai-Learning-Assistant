import express from 'express';
import {
  generateAIQuizOrFlashcards,
  explainConceptOrSummary,
} from '../controllers/aiController.js';

const router = express.Router();

// AI generation endpoints
router.post('/generate-flashcards', generateAIQuizOrFlashcards);
router.post('/explain', explainConceptOrSummary);

export default router;