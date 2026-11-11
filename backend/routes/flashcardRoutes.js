import express from 'express';
import {
  getFlashcards,
  createFlashcards,
  reviewFlashcard,
  toggleFavorite,
  deleteFlashcard,
} from '../controllers/flashcardController.js';

const router = express.Router();

router.post('/', createFlashcards);
router.get('/:userId', getFlashcards);
router.patch('/card/:cardId/review', reviewFlashcard);
router.patch('/card/:cardId/favorite', toggleFavorite);
router.delete('/card/:cardId', deleteFlashcard);

export default router;