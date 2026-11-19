const Document = require('../models/Document');
const Flashcard = require('../models/Flashcard');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');

// Format date as YYYY-MM-DD in local time for accurate daily grouping
const toDateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format date key for clean chart labels
const toShortLabel = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

exports.getUserImprovementData = async (req, res) => {
  try {
    const { userId } = req.params;
    const days = Math.min(30, Math.max(5, Number(req.query.days) || 7));

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const [docs, decks, quizzes, submissions] = await Promise.all([
      Document.find({ userId }).lean().catch(() => []),
      Flashcard.find({ userId }).lean().catch(() => []),
      Quiz.find({ userId }).lean().catch(() => []),
      QuizSubmission.find({ userId }).lean().catch(() => []),
    ]);

    const dayMap = new Map();

    // Initialize the last N days with zero activity
    const today = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const target = new Date(today);
      target.setDate(today.getDate() - i);
      const key = toDateKey(target);
      dayMap.set(key, {
        dateKey: key,
        label: toShortLabel(key),
        documentsCreated: 0,
        flashcardsCreated: 0,
        quizzesCreated: 0,
        quizzesSubmitted: 0,
        totalActivity: 0,
        scoreSum: 0,
        scoreCount: 0,
      });
    }

    const touchDay = (dateVal) => {
      const key = toDateKey(dateVal);
      if (!key) return null;
      if (!dayMap.has(key)) {
        dayMap.set(key, {
          dateKey: key,
          label: toShortLabel(key),
          documentsCreated: 0,
          flashcardsCreated: 0,
          quizzesCreated: 0,
          quizzesSubmitted: 0,
          totalActivity: 0,
          scoreSum: 0,
          scoreCount: 0,
        });
      }
      return dayMap.get(key);
    };

    docs.forEach((doc) => {
      const entry = touchDay(doc.uploadDate || doc.createdAt);
      if (entry) {
        entry.documentsCreated += 1;
        entry.totalActivity += 1;
      }
    });

    decks.forEach((deck) => {
      const entry = touchDay(deck.createdAt);
      if (entry) {
        entry.flashcardsCreated += 1;
        entry.totalActivity += 1;
      }
    });

    quizzes.forEach((quiz) => {
      const entry = touchDay(quiz.createdAt);
      if (entry) {
        entry.quizzesCreated += 1;
        entry.totalActivity += 1;
      }
    });

    submissions.forEach((sub) => {
      const entry = touchDay(sub.submittedAt || sub.createdAt);
      if (entry) {
        entry.quizzesSubmitted += 1;
        entry.totalActivity += 1;
        const totalQ = Number(sub.totalQuestions) || 0;
        const scoreVal = Number(sub.score) || 0;
        const pct =
          typeof sub.percentage === 'number'
            ? sub.percentage
            : totalQ > 0
            ? (scoreVal / totalQ) * 100
            : 0;
        entry.scoreSum += Math.min(100, Math.max(0, pct));
        entry.scoreCount += 1;
      }
    });

    const sortedDays = Array.from(dayMap.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-days);

    const maxActivity = Math.max(
      1,
      ...sortedDays.map((item) => Number(item.totalActivity) || 0)
    );

    const series = sortedDays.map((item, idx) => {
      const prev = idx > 0 ? sortedDays[idx - 1] : null;
      const delta = prev ? item.totalActivity - prev.totalActivity : 0;
      const avgDayScore =
        item.scoreCount > 0 ? Math.round(item.scoreSum / item.scoreCount) : null;

      let intensity = 'none';
      if (item.totalActivity === 0) {
        intensity = 'none';
      } else if (item.totalActivity >= Math.max(2, Math.ceil(maxActivity * 0.66))) {
        intensity = 'high';
      } else if (item.totalActivity >= 2) {
        intensity = 'medium';
      } else {
        intensity = 'low';
      }

      return {
        dateKey: item.dateKey,
        label: item.label,
        documentsCreated: item.documentsCreated,
        flashcardsCreated: item.flashcardsCreated,
        quizzesCreated: item.quizzesCreated,
        quizzesSubmitted: item.quizzesSubmitted,
        totalActivity: item.totalActivity,
        delta,
        intensity,
        avgDayScore,
      };
    });

    const activeDays = series.filter((d) => d.totalActivity > 0).length;
    const inactiveDays = series.length - activeDays;
    const totalActions = series.reduce((acc, d) => acc + d.totalActivity, 0);

    return res.status(200).json({
      success: true,
      data: {
        days,
        activeDays,
        inactiveDays,
        totalActions,
        maxActivity,
        series,
      },
    });
  } catch (err) {
    console.error('Improvement Controller Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load improvement analytics',
    });
  }
};