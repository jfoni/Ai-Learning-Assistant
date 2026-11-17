import express from 'express';
import { generateFlashcards } from '../controllers/flashcardController.js';

const router = express.Router();

router.post('/:id', generateFlashcards);

export default router;