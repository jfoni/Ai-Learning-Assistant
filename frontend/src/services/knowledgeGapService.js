import axios from 'axios';
import { getQuizSubmissions } from './quizService';
import { fetchDocuments } from './documentService';

const API_BASE = 'http://localhost:8000/api/knowledge-gaps';

export const analyzeKnowledgeGaps = async (userId) => {
  if (!userId) {
    return { hasEnoughData: false, topics: [], aiInsights: null };
  }

  const [submissions, documents] = await Promise.all([
    getQuizSubmissions(userId).catch(() => []),
    fetchDocuments(userId).catch(() => []),
  ]);

  const safeSubs = Array.isArray(submissions) ? submissions : [];
  const safeDocs = Array.isArray(documents) ? documents : [];

  if (safeSubs.length === 0) {
    return {
      hasEnoughData: false,
      totalSubmissionsAnalyzed: 0,
      topics: [],
      aiInsights: null,
    };
  }

  try {
    const res = await axios.post(`${API_BASE}/analyze`, {
      userId,
      submissions: safeSubs,
      documents: safeDocs,
    });
    if (res.data?.success) {
      return res.data;
    }
  } catch {
    // Fallback to local aggregation from real user submissions
  }

  const groupMap = new Map();
  for (const sub of safeSubs) {
    const topicName = String(sub.topic || sub.title || 'Study Quiz').trim();
    const key = topicName.toLowerCase();
    const totalQ =
      Number(sub.totalQuestions) ||
      (Array.isArray(sub.questions) ? sub.questions.length : 0);
    const correctQ =
      typeof sub.score === 'number'
        ? Number(sub.score)
        : Array.isArray(sub.questions)
        ? sub.questions.filter(
            (q) =>
              String(q.selectedAnswer || '').trim() &&
              String(q.selectedAnswer || '').trim() ===
                String(q.correctAnswer || '').trim()
          ).length
        : 0;
    const pct =
      typeof sub.percentage === 'number' && !Number.isNaN(sub.percentage)
        ? Math.min(100, Math.max(0, Math.round(sub.percentage)))
        : totalQ > 0
        ? Math.min(100, Math.max(0, Math.round((correctQ / totalQ) * 100)))
        : 0;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        topic: topicName,
        attempts: 0,
        totalQuestions: 0,
        correctQuestions: 0,
        wrongQuestions: 0,
        scores: [],
      });
    }
    const g = groupMap.get(key);
    g.attempts += 1;
    g.totalQuestions += totalQ;
    g.correctQuestions += correctQ;
    g.wrongQuestions += Math.max(0, totalQ - correctQ);
    g.scores.push(pct);
  }

  const topics = Array.from(groupMap.values())
    .map((g) => {
      const avgPercentage = Math.round(
        g.scores.reduce((a, b) => a + b, 0) / g.scores.length
      );
      const category =
        avgPercentage >= 75
          ? 'Strong'
          : avgPercentage >= 50
          ? 'Needs Improvement'
          : 'Weak';

      const matchedDoc = safeDocs.find((d) =>
        String(d.title || '')
          .toLowerCase()
          .includes(g.topic.toLowerCase())
      );

      return {
        ...g,
        avgPercentage,
        latestPercentage: g.scores[g.scores.length - 1],
        progressDelta:
          g.scores.length > 1
            ? g.scores[g.scores.length - 1] - g.scores[g.scores.length - 2]
            : null,
        category,
        recommendedDocument: matchedDoc
          ? { id: matchedDoc._id || matchedDoc.id, title: matchedDoc.title }
          : null,
      };
    })
    .sort((a, b) => a.avgPercentage - b.avgPercentage);

  const weakList = topics.filter((t) => t.category !== 'Strong');

  return {
    hasEnoughData: true,
    totalSubmissionsAnalyzed: safeSubs.length,
    topics,
    aiInsights: {
      summary:
        weakList.length > 0
          ? `Detected ${weakList.length} topic(s) needing attention based on your actual quiz attempts.`
          : 'All tracked topics are currently in the Strong range.',
      topicAnalyses: weakList.map((t) => ({
        topic: t.topic,
        whyDifficult: `${t.wrongQuestions} of ${t.totalQuestions} questions missed across ${t.attempts} attempt(s).`,
        possibleMisunderstanding:
          'Review missed questions and underlying definitions before the next quiz.',
        studyAdvice: `Practice targeted questions on ${t.topic} and review your notes.`,
        flashcardFocus: `Revise key concepts and formulas for ${t.topic}.`,
      })),
    },
  };
};