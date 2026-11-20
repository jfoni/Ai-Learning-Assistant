import { Quiz, QuizSubmission } from '../models/Quiz.js';
import Flashcard from '../models/Flashcard.js';
import Document from '../models/Document.js';

export const getDashboardOverview = async (req, res) => {
  try {
    const userId =
      req.query.userId || req.params.userId || req.user?.uid || req.user?.id;

    if (!userId) {
      return res.status(200).json({
        success: true,
        data: {
          stats: {
            totalQuizzes: 0,
            totalFlashcards: 0,
            totalDocuments: 0,
            totalSubmissions: 0,
            averageScore: 0,
            averageScorePercentage: '0%',
          },
          recentActivity: {
            quizzes: [],
            submissions: [],
            documents: [],
          },
        },
      });
    }

    const uidStr = String(userId);
    const filter = { userId: uidStr };

    const [totalQuizzes, totalFlashcards, totalDocuments, totalSubmissions] =
      await Promise.all([
        Quiz.collection.countDocuments(filter),
        Flashcard.collection.countDocuments(filter),
        Document.countDocuments(filter),
        QuizSubmission.collection.countDocuments(filter),
      ]);

    const submissions = await QuizSubmission.collection
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    let averageScore = 0;

    if (submissions.length > 0) {
      const totalPct = submissions.reduce((acc, sub) => {
        if (typeof sub.percentage === 'number' && !Number.isNaN(sub.percentage)) {
          return acc + sub.percentage;
        }
        const totalQ = Number(sub.totalQuestions) || 0;
        const scoreVal = Number(sub.score) || 0;
        return acc + (totalQ > 0 ? (scoreVal / totalQ) * 100 : 0);
      }, 0);
      averageScore = Math.round(totalPct / submissions.length);
    }

    const [recentQuizzes, recentDocuments, recentSubmissions] = await Promise.all([
      Quiz.collection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(5)
        .project({ title: 1, topic: 1, difficulty: 1, createdAt: 1 })
        .toArray(),
      Document.find(filter)
        .sort({ uploadDate: -1, createdAt: -1 })
        .limit(5)
        .select('title createdAt uploadDate')
        .lean(),
      QuizSubmission.collection
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalQuizzes: Number(totalQuizzes) || 0,
          totalFlashcards: Number(totalFlashcards) || 0,
          totalDocuments: Number(totalDocuments) || 0,
          totalSubmissions: Number(totalSubmissions) || 0,
          averageScore: Number(averageScore) || 0,
          averageScorePercentage: `${Number(averageScore) || 0}%`,
        },
        recentActivity: {
          quizzes: recentQuizzes,
          submissions: recentSubmissions,
          documents: recentDocuments,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};