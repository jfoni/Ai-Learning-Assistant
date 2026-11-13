import express from 'express';
import {
  generateAIQuizOrFlashcards,
  generateSummary,
  explainConceptOrSummary,
  aiChat,
  getChatHistory,
} from '../controllers/aiController.js';
import { generateAIQuiz } from '../controllers/quizController.js';

const router = express.Router();

router.post('/generate-flashcards', generateAIQuizOrFlashcards);
router.post('/generate-quiz', generateAIQuiz);
router.post('/generate-summary', generateSummary);
router.post('/explain-concept', explainConceptOrSummary);
router.post('/chat', aiChat);
router.get('/chat-history', getChatHistory);

export default router;