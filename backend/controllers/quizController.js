import { GoogleGenAI } from '@google/genai';
import { Quiz, QuizSubmission } from '../models/Quiz.js';
import dotenv from 'dotenv';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const MODEL_NAME = 'gemini-3.5-flash-lite';

// Helper: Call Gemini with retry
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
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
};

// Helper: Parse JSON
const parseGeminiJSON = (text) => {
  let rawText = text.trim();
  rawText = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(rawText);
};

// 1. Generate & Save AI Quiz
export const generateAIQuiz = async (req, res) => {
  try {
    const { userId, title, textContent } = req.body;

    if (!textContent || !textContent.trim()) {
      return res.status(400).json({ success: false, error: 'Text content is required' });
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

    const newQuiz = await Quiz.create({
      userId: userId || null,
      title: title || 'AI Generated Quiz',
      questions: quizArray,
    });

    return res.status(201).json({
      success: true,
      message: 'AI quiz generated and saved successfully',
      data: newQuiz,
    });
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 2. Get All Quizzes
export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: quizzes.length,
      data: quizzes,
    });
  } catch (error) {
    console.error('Get All Quizzes Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 3. Get Quiz By ID
export const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const quiz = await Quiz.findById(id);

    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    return res.status(200).json({ success: true, data: quiz });
  } catch (error) {
    console.error('Get Quiz By ID Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 4. Submit Quiz & Calculate Score
export const submitQuiz = async (req, res) => {
  try {
    const { quizId, userId, answers } = req.body;

    if (!quizId || !answers || !Array.isArray(answers)) {
      return res.status(400).json({ success: false, error: 'Quiz ID and answers array are required' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    let score = 0;
    const evaluatedAnswers = quiz.questions.map((q, index) => {
      const userAnswerObj = answers.find((a) => a.questionIndex === index);
      const selectedAnswer = userAnswerObj ? userAnswerObj.selectedAnswer : null;
      const isCorrect = selectedAnswer === q.correctAnswer;

      if (isCorrect) score++;

      return {
        questionIndex: index,
        selectedAnswer,
        isCorrect,
      };
    });

    const submission = await QuizSubmission.create({
      userId: userId || null,
      quizId,
      score,
      totalQuestions: quiz.questions.length,
      answers: evaluatedAnswers,
    });

    return res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      data: {
        score,
        totalQuestions: quiz.questions.length,
        percentage: (score / quiz.questions.length) * 100,
        submissionId: submission._id,
        evaluatedAnswers,
      },
    });
  } catch (error) {
    console.error('Submit Quiz Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 5. Get Quiz Results
export const getQuizResults = async (req, res) => {
  try {
    const { quizId } = req.params;
    const results = await QuizSubmission.find({ quizId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    console.error('Get Quiz Results Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// 6. Delete Quiz
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuiz = await Quiz.findByIdAndDelete(id);

    if (!deletedQuiz) {
      return res.status(404).json({ success: false, error: 'Quiz not found' });
    }

    await QuizSubmission.deleteMany({ quizId: id });

    return res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully',
    });
  } catch (error) {
    console.error('Delete Quiz Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};