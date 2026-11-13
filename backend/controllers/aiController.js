import { GoogleGenAI } from '@google/genai';
import Flashcard from '../models/Flashcard.js';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL_NAME = 'gemini-3.5-flash-lite';

// Helper function with automatic retry
const callGeminiWithRetry = async (prompt, retries = 3, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
      });

      return response;
    } catch (error) {
      const message = error.message || '';

      const shouldRetry =
        message.includes('503') ||
        message.includes('429') ||
        message.includes('UNAVAILABLE') ||
        message.includes('RESOURCE_EXHAUSTED') ||
        error.status === 503 ||
        error.status === 429;

      if (shouldRetry && i < retries - 1) {
        const waitTime = delay * Math.pow(2, i);

        console.warn(
          `Gemini request failed. Retrying attempt ${i + 2} in ${waitTime / 1000}s...`
        );

        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      throw error;
    }
  }
};

// Helper function to clean and parse JSON response
const parseGeminiJSON = (text) => {
  let rawText = text.trim();

  rawText = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  return JSON.parse(rawText);
};

// 1. Generate Flashcards using Gemini AI
export const generateAIQuizOrFlashcards = async (req, res) => {
  try {
    const { userId, documentId, textContent } = req.body;

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required',
      });
    }

    const prompt = `
      Based on the following text, generate 5 flashcards
      with a question and answer for each.

      Return ONLY a valid JSON array of objects with keys
      "question" and "answer".

      Do not include markdown formatting or extra text.

      Text: ${textContent}
    `;

    const response = await callGeminiWithRetry(prompt);
    const cardsArray = parseGeminiJSON(response.text);

    if (!Array.isArray(cardsArray) || cardsArray.length === 0) {
      throw new Error('Invalid flashcard response from AI');
    }

    const newFlashcard = await Flashcard.create({
      userId,
      documentId: documentId || null,
      cards: cardsArray,
    });

    return res.status(201).json({
      success: true,
      message: 'AI flashcards generated successfully',
      data: newFlashcard,
    });
  } catch (error) {
    console.error('Flashcard Generation Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// 2. Generate Summary using Gemini AI
export const generateSummary = async (req, res) => {
  try {
    const { textContent } = req.body;

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required',
      });
    }

    const prompt = `
      Provide a concise, structured, and easy-to-understand summary of the following text. 
      Highlight the core key points clearly using bullet points if necessary.

      Text: ${textContent}
    `;

    const response = await callGeminiWithRetry(prompt);

    if (!response || !response.text) {
      throw new Error('Invalid summary response from AI');
    }

    return res.status(200).json({
      success: true,
      message: 'Summary generated successfully',
      summary: response.text,
    });
  } catch (error) {
    console.error('Summary Generation Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// 3. Explain Concept
export const explainConceptOrSummary = async (req, res) => {
  try {
    const { concept } = req.body;

    if (!concept || !concept.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Concept is required',
      });
    }

    const prompt = `
      Explain the following concept clearly and concisely
      for a computer science student.

      Use simple language and practical examples.

      Concept: ${concept}
    `;

    const response = await callGeminiWithRetry(prompt);

    if (!response || !response.text) {
      throw new Error('Invalid explanation response from AI');
    }

    return res.status(200).json({
      success: true,
      message: 'Concept explained successfully',
      explanation: response.text,
    });
  } catch (error) {
    console.error('Concept Explanation Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// 4. Interactive AI Chat
export const aiChat = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const response = await callGeminiWithRetry(message);

    if (!response || !response.text) {
      throw new Error('Invalid chat response from AI');
    }

    return res.status(200).json({
      success: true,
      reply: response.text,
    });
  } catch (error) {
    console.error('AI Chat Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// 5. Get Chat History
export const getChatHistory = async (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      message: 'Chat history fetched successfully',
      history: [],
    });
  } catch (error) {
    console.error('Chat History Error:', error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};