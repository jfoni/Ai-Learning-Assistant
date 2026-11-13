import { Quiz, QuizSubmission } from '../models/Quiz.js';
import Flashcard from '../models/Flashcard.js';

// Get Dashboard Overview Stats
export const getDashboardOverview = async (req, res) => {
  try {
    const { userId } = req.query;
    const filter = userId ? { userId } : {};

    // Fetch counts in parallel
    const [totalQuizzes, totalFlashcards, totalSubmissions] = await Promise.all([
      Quiz.countDocuments(filter),
      Flashcard.countDocuments(filter),
      QuizSubmission.countDocuments(filter),
    ]);

    // Calculate average quiz score percentage
    const submissions = await QuizSubmission.find(filter);
    let averageScore = 0;

    if (submissions.length > 0) {
      const totalPercentage = submissions.reduce((acc, sub) => {
        const percentage = sub.totalQuestions > 0 ? (sub.score / sub.totalQuestions) * 100 : 0;
        return acc + percentage;
      }, 0);
      averageScore = Math.round(totalPercentage / submissions.length);
    }

    // Fetch recent activities
    const recentQuizzes = await Quiz.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt');

    const recentSubmissions = await QuizSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('quizId', 'title');

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          totalQuizzes,
          totalFlashcards,
          totalSubmissions,
          averageScore,
        },
        recentActivity: {
          quizzes: recentQuizzes,
          submissions: recentSubmissions,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard Overview Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};