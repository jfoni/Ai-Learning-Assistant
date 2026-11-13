import { GoogleGenAI } from '@google/genai';
import Quiz from '../models/Quiz.js'; // যদি ডেটাবেজে সেভ করতে চান, না হলে রিমুভ করতে পারেন
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
        console.warn(`Gemini request failed. Retrying attempt ${i + 2} in ${waitTime / 1000}s...`);
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

// Generate Quiz using Gemini AI
export const generateAIQuiz = async (req, res) => {
  try {
    const { textContent } = req.body;

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required',
      });
    }

    const prompt = `
      Based on the following text, generate 3 multiple-choice quiz questions.

      Each question must contain:
      1. question
      2. options (exactly 4 options)
      3. correctAnswer (the exact correct option string)

      Return ONLY a valid JSON array. Do not include markdown or extra text.

      Text: ${textContent}
    `;

    const response = await callGeminiWithRetry(prompt);
    const quizArray = parseGeminiJSON(response.text);

    if (!Array.isArray(quizArray) || quizArray.length === 0) {
      throw new Error('Invalid quiz response from AI');
    }

    for (const quiz of quizArray) {
      if (
        !quiz.question ||
        !Array.isArray(quiz.options) ||
        quiz.options.length !== 4 ||
        !quiz.correctAnswer ||
        !quiz.options.includes(quiz.correctAnswer)
      ) {
        throw new Error('Invalid quiz question format');
      }
    }

    return res.status(200).json({
      success: true,
      message: 'AI quiz generated successfully',
      data: quizArray,
    });

  } catch (error) {
    console.error('Quiz Generation Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};