import express from 'express';
import {
  generateFlashcards,
  getFlashcardsByUser,
  deleteFlashcard,
} from '../controllers/flashcardController.js';

const router = express.Router();

router.post('/generate', generateFlashcards);
router.post('/custom', generateFlashcards);
router.get('/user/:userId', getFlashcardsByUser);
router.post('/:id', generateFlashcards);
router.delete('/:id', deleteFlashcard);

export default router;