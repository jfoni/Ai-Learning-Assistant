import Flashcard from '../models/Flashcard.js';
import mongoose from 'mongoose';

export const createFlashcards = async (req, res) => {
  try {
    const { userId, documentId, cards } = req.body;

    const newFlashcard = await Flashcard.create({
      userId,
      documentId,
      cards,
    });

    res.status(201).json({
      success: true,
      message: 'Flashcards created successfully',
      data: newFlashcard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Get Flashcards (Get all flashcard document sets by userId)
export const getFlashcards = async (req, res) => {
  try {
    const { userId } = req.params;
    const flashcards = await Flashcard.find({ userId }).populate('documentId', 'title fileName');

    res.status(200).json({
      success: true,
      count: flashcards.length,
      data: flashcards,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Review Flashcard (Update reviewCount, lastReviewed, and difficulty for a specific card inside the array)
export const reviewFlashcard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { difficulty } = req.body; // easy, medium, hard

    const flashcardDoc = await Flashcard.findOne({ 'cards._id': cardId });
    if (!flashcardDoc) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found',
      });
    }

    const card = flashcardDoc.cards.id(cardId);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card item not found' });
    }

    card.reviewCount += 1;
    card.lastReviewed = Date.now();
    if (difficulty) card.difficulty = difficulty;

    await flashcardDoc.save();

    res.status(200).json({
      success: true,
      message: 'Flashcard reviewed successfully',
      data: card,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Toggle Favorite / Starred (Switch isStarred true/false for a specific card)
export const toggleFavorite = async (req, res) => {
  try {
    const { cardId } = req.params;

    const flashcardDoc = await Flashcard.findOne({ 'cards._id': cardId });
    if (!flashcardDoc) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found',
      });
    }

    const card = flashcardDoc.cards.id(cardId);
    if (!card) {
      return res.status(404).json({ success: false, error: 'Card item not found' });
    }

    card.isStarred = !card.isStarred;
    await flashcardDoc.save();

    res.status(200).json({
      success: true,
      message: `Flashcard ${card.isStarred ? 'added to' : 'removed from'} favorites`,
      data: card,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

//Delete Flashcard (Remove a single card from the cards array, or delete the parent doc if empty)
export const deleteFlashcard = async (req, res) => {
  try {
    const { cardId } = req.params;

    const flashcardDoc = await Flashcard.findOne({ 'cards._id': cardId });
    if (!flashcardDoc) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard not found',
      });
    }

    // Pull/remove the specific card from the cards array
    flashcardDoc.cards.pull(cardId);
    
    // Optional: If no cards left in this document set, you can delete the parent document
    if (flashcardDoc.cards.length === 0) {
      await Flashcard.findByIdAndDelete(flashcardDoc._id);
    } else {
      await flashcardDoc.save();
    }

    res.status(200).json({
      success: true,
      message: 'Flashcard deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};