import axios from 'axios';
import { fetchDocuments } from './documentService';

const API_BASE_URL = 'http://localhost:8000/api';

// Fetch user documents to generate quizzes from study material
export const fetchQuizDocuments = async (userId) => {
  if (!userId) return [];
  const docs = await fetchDocuments(userId);
  return Array.isArray(docs) ? docs : [];
};

// Fetch saved quizzes for a user
export const fetchUserQuizzes = async (userId) => {
  if (!userId) return [];
  const res = await axios.get(`${API_BASE_URL}/quizzes/user/${userId}`).catch(() => null);
  return Array.isArray(res?.data?.data) ? res.data.data : [];
};

// Generate a new quiz via backend AI endpoint with local fallback questions
export const generateQuizSet = async ({
  userId,
  documentId = null,
  customTopic = '',
  difficulty = 'medium',
  questionCount = 5,
}) => {
  const safeCount = Math.min(15, Math.max(1, Number(questionCount) || 5));
  const topicLabel = customTopic.trim() || 'Study Topic';

  const apiRes = await axios
    .post(`${API_BASE_URL}/quizzes/generate`, {
      userId,
      documentId,
      customTopic: topicLabel,
      difficulty,
      questionCount: safeCount,
    })
    .catch(() => null);

  if (apiRes?.data?.success && apiRes?.data?.data) {
    return apiRes.data.data;
  }

  // Fallback question set if backend quiz endpoint is not connected yet
  const fallbackQuestions = Array.from({ length: safeCount }, (_, idx) => {
    const qNum = idx + 1;
    return {
      question: `${topicLabel}: Which statement best reflects key concept #${qNum} (${difficulty})?`,
      options: [
        `Core principle of ${topicLabel} applied in practical scenarios`,
        `Ignoring requirements and guessing randomly`,
        `Removing all constraints without testing`,
        `Storing data without structure or validation`,
      ],
      correctAnswer: `Core principle of ${topicLabel} applied in practical scenarios`,
      explanation: `Focusing on core principles of ${topicLabel} helps solve problems accurately in real-life cases.`,
    };
  });

  return {
    _id: `local-quiz-${Date.now()}`,
    title: `${topicLabel} Quiz`,
    difficulty,
    questions: fallbackQuestions,
  };
};

// Submit completed quiz answers
export const submitQuizAttempt = async ({
  userId,
  quizId,
  score,
  totalQuestions,
  answers = [],
}) => {
  const safeTotal = Math.max(1, Number(totalQuestions) || 1);
  const safeScore = Math.max(0, Number(score) || 0);
  const percentage = Math.round((safeScore / safeTotal) * 100);

  const apiRes = await axios
    .post(`${API_BASE_URL}/quizzes/submit`, {
      userId,
      quizId,
      score: safeScore,
      totalQuestions: safeTotal,
      percentage,
      answers,
    })
    .catch(() => null);

  return (
    apiRes?.data?.data || {
      score: safeScore,
      totalQuestions: safeTotal,
      percentage,
    }
  );
};