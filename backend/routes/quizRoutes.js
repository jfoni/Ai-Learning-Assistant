import express from 'express';
import {
  generateAIQuiz,
  getAllQuizzes,
  getQuizById,
  submitQuiz,
  getQuizResults,
  deleteQuiz,
} from '../controllers/quizController.js';

const router = express.Router();

router.post('/generate', generateAIQuiz);
router.get('/', getAllQuizzes);
router.get('/:id', getQuizById);
router.post('/submit', submitQuiz);
router.get('/:quizId/results', getQuizResults);
router.delete('/:id', deleteQuiz);

export default router;