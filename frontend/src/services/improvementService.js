import axios from 'axios';
import { fetchDocuments } from './documentService';
import { getDashboardOverview } from './dashboardService';

const API_BASE_URL = 'http://localhost:8000/api';

// Convert a Date or timestamp into local YYYY-MM-DD key
export const toLocalDateKey = (dateInput) => {
  const dt = new Date(dateInput);
  if (Number.isNaN(dt.getTime())) return null;
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format YYYY-MM-DD key into a short chart label
export const toShortDateLabel = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Combine flashcards, documents, quizzes, and submissions into a date-wise series
export const buildCombinedActivitySeries = ({
  docs = [],
  decks = [],
  quizzes = [],
  submissions = [],
  daysCount = 7,
}) => {
  const map = new Map();
  const today = new Date();

  for (let i = daysCount - 1; i >= 0; i -= 1) {
    const target = new Date(today);
    target.setDate(today.getDate() - i);
    const key = toLocalDateKey(target);
    map.set(key, {
      dateKey: key,
      label: toShortDateLabel(key),
      documentsCreated: 0,
      flashcardsCreated: 0,
      quizzesCreated: 0,
      quizzesSubmitted: 0,
      totalActivity: 0,
    });
  }

  const ensureDay = (val) => {
    const key = toLocalDateKey(val);
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        dateKey: key,
        label: toShortDateLabel(key),
        documentsCreated: 0,
        flashcardsCreated: 0,
        quizzesCreated: 0,
        quizzesSubmitted: 0,
        totalActivity: 0,
      });
    }
    return map.get(key);
  };

  docs.forEach((doc) => {
    const row = ensureDay(doc.uploadDate || doc.createdAt);
    if (row) {
      row.documentsCreated += 1;
      row.totalActivity += 1;
    }
  });

  decks.forEach((deck) => {
    const row = ensureDay(deck.createdAt);
    if (row) {
      row.flashcardsCreated += 1;
      row.totalActivity += 1;
    }
  });

  quizzes.forEach((quiz) => {
    const row = ensureDay(quiz.createdAt);
    if (row) {
      row.quizzesCreated += 1;
      row.totalActivity += 1;
    }
  });

  submissions.forEach((sub) => {
    const row = ensureDay(sub.submittedAt || sub.createdAt);
    if (row) {
      row.quizzesSubmitted += 1;
      row.totalActivity += 1;
    }
  });

  const sorted = Array.from(map.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(-daysCount);

  const peak = Math.max(1, ...sorted.map((item) => Number(item.totalActivity) || 0));

  return sorted.map((item, idx) => {
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const delta = prev ? item.totalActivity - prev.totalActivity : 0;

    let level = 'none';
    if (item.totalActivity === 0) {
      level = 'none';
    } else if (item.totalActivity >= Math.max(2, Math.ceil(peak * 0.66))) {
      level = 'high';
    } else if (item.totalActivity >= 2) {
      level = 'medium';
    } else {
      level = 'low';
    }

    return {
      ...item,
      delta,
      level,
      heightPercent:
        item.totalActivity === 0
          ? 8
          : Math.max(18, Math.round((item.totalActivity / peak) * 100)),
    };
  });
};

// Fetch user improvement data from backend controller with fallback aggregation
export const getImprovementAnalytics = async (userId, days = 7) => {
  if (!userId) return [];

  const apiRes = await axios
    .get(`${API_BASE_URL}/improvement/${userId}?days=${days}`)
    .catch(() => null);

  if (apiRes?.data?.success && Array.isArray(apiRes.data.data?.series)) {
    const rawSeries = apiRes.data.data.series;
    const peak = Math.max(1, ...rawSeries.map((d) => Number(d.totalActivity) || 0));

    return rawSeries.map((d) => ({
      ...d,
      totalActivity: Number(d.totalActivity) || 0,
      documentsCreated: Number(d.documentsCreated) || 0,
      flashcardsCreated: Number(d.flashcardsCreated) || 0,
      quizzesCreated: Number(d.quizzesCreated) || 0,
      quizzesSubmitted: Number(d.quizzesSubmitted) || 0,
      delta: Number(d.delta) || 0,
      heightPercent:
        (Number(d.totalActivity) || 0) === 0
          ? 8
          : Math.max(18, Math.round(((Number(d.totalActivity) || 0) / peak) * 100)),
    }));
  }

  const [docsData, decksRes, overviewRes] = await Promise.all([
    fetchDocuments(userId).catch(() => []),
    axios
      .get(`${API_BASE_URL}/flashcards/user/${userId}`)
      .catch(() => ({ data: { data: [] } })),
    getDashboardOverview(userId).catch(() => ({ data: {} })),
  ]);

  const docs = Array.isArray(docsData) ? docsData : [];
  const decks = Array.isArray(decksRes?.data?.data) ? decksRes.data.data : [];
  const quizzes = Array.isArray(overviewRes?.data?.recentActivity?.quizzes)
    ? overviewRes.data.recentActivity.quizzes
    : [];
  const submissions = Array.isArray(overviewRes?.data?.recentActivity?.submissions)
    ? overviewRes.data.recentActivity.submissions
    : [];

  return buildCombinedActivitySeries({
    docs,
    decks,
    quizzes,
    submissions,
    daysCount: days,
  });
};