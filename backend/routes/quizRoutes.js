import express from 'express';
import {
  generateQuiz,
  getQuizzes,
  getQuizById,
  submitQuiz,
  getAllSubmissions,
  deleteQuizSubmission,
  getQuizSubmissions,
  deleteQuiz,
  saveFlashcardsFromQuiz,
} from '../controllers/quizController.js';

const router = express.Router();

router.post('/generate', generateQuiz);
router.post('/submit', submitQuiz);
router.get('/submissions/all', getAllSubmissions);
router.delete('/submissions/:submissionId', deleteQuizSubmission);
router.post('/save-flashcards', saveFlashcardsFromQuiz);
router.get('/', getQuizzes);
router.get('/:id', getQuizById);
router.get('/:quizId/submissions', getQuizSubmissions);
router.delete('/:id', deleteQuiz);

export default router;