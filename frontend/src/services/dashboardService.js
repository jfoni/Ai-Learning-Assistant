import axios from 'axios';

// Fetch dashboard overview and compute percentage average score with local storage fallback
export const getDashboardOverview = async (userId) => {
  try {
    const url = userId
      ? `http://localhost:8000/api/dashboard/${userId}`
      : 'http://localhost:8000/api/dashboard/overview';
    const res = await axios.get(url);
    const payload = res.data;

    if (payload?.data?.stats) {
      const avg = Number(payload.data.stats.averageScore) || 0;
      payload.data.stats.averageScore = avg;
      payload.data.stats.averageScorePercentage = `${avg}%`;
    }

    return payload;
  } catch {
    const rawSubs = localStorage.getItem('quiz_submissions_list');
    const submissions = rawSubs ? JSON.parse(rawSubs) : [];
    const safeSubs = Array.isArray(submissions) ? submissions : [];

    const avgScore =
      safeSubs.length > 0
        ? Math.round(
            safeSubs.reduce((acc, s) => {
              if (typeof s.percentage === 'number' && !Number.isNaN(s.percentage)) {
                return acc + s.percentage;
              }
              const totalQ = Number(s.totalQuestions) || 0;
              const scoreVal = Number(s.score) || 0;
              return acc + (totalQ > 0 ? (scoreVal / totalQ) * 100 : 0);
            }, 0) / safeSubs.length
          )
        : 0;

    return {
      success: true,
      offlineFallback: true,
      data: {
        avgScore,
        submissions: safeSubs,
        stats: {
          averageScore: avgScore,
          averageScorePercentage: `${avgScore}%`,
          totalSubmissions: safeSubs.length,
        },
      },
    };
  }
};