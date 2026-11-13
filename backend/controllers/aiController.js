import { GoogleGenAI } from '@google/genai';
import Flashcard from '../models/Flashcard.js';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Generate Flashcards using Gemini AI
export const generateAIQuizOrFlashcards = async (req, res) => {
  try {
    const { userId, documentId, textContent } = req.body;

    if (!textContent) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
    }

    const prompt = `Based on the following text, generate 5 flashcards with a question and answer for each. Return ONLY a valid JSON array of objects with keys "question" and "answer". Do not include any markdown formatting or extra text.
    
    Text: ${textContent}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    let rawText = response.text.trim();
    if (rawText.startsWith('```json')) {
      rawText = rawText.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```/, '').replace(/```$/, '').trim();
    }

    const cardsArray = JSON.parse(rawText);

    const newFlashcard = await Flashcard.create({
      userId,
      documentId: documentId || null,
      cards: cardsArray,
    });

    res.status(201).json({
      success: true,
      message: 'AI flashcards generated successfully',
      data: newFlashcard,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// Explain Concept or Generate Summary
export const explainConceptOrSummary = async (req, res) => {
  try {
    const { concept } = req.body;

    if (!concept) {
      return res.status(400).json({ success: false, error: 'Concept is required' });
    }

    const response = await ai.models.generateContent({
     model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.status(200).json({
      success: true,
      message: 'Concept explained successfully',
      explanation: response.text,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};