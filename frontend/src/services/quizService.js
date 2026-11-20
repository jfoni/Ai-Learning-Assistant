import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/quizzes';

const cleanLabel = (val = '') => {
  const cleaned = String(val)
    .replace(/\bpdf\b/gi, '')
    .replace(/\.(pdf|docx|doc|pptx|ppt|txt|csv|md)\b/gi, '')
    .replace(/\s*\(\d+\)\s*/g, ' ')
    .replace(/^\s*\d+(\.\d+)*[.):\-\s]+/, '')
    .replace(/[#*^$`~|\\{}[\]<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.replace(/\.+$/, '').trim() || 'Study Quiz';
};

export const generateQuiz = async (payload) => {
  const cleanPayload = {
    ...payload,
    ...(payload?.topic ? { topic: cleanLabel(payload.topic) } : {}),
    ...(payload?.title ? { title: cleanLabel(payload.title) } : {}),
  };
  const res = await axios.post(`${API_BASE}/generate`, cleanPayload);
  return res.data;
};

export const deleteCreatedQuizById = async (quizId) => {
  if (!quizId) return;
  await axios.delete(`${API_BASE}/${quizId}`).catch(() => null);
};

export const submitQuizResult = async ({
  quizId,
  userId,
  topic,
  category,
  difficulty,
  durationSeconds = 0,
  questions = [],
  selectedAnswers = {},
}) => {
  const correctCount = questions.reduce((acc, q, idx) => {
    return String(selectedAnswers[idx] || '').trim() ===
      String(q.correctAnswer || '').trim()
      ? acc + 1
      : acc;
  }, 0);

  const totalQuestions = questions.length || 1;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const finalTopic = cleanLabel(topic || 'Study Quiz');
  const submittedAt = new Date().toISOString();

  let submissionId = `sub-${Date.now()}`;
  let apiResults = [];

  if (quizId) {
    const formattedAnswers = questions.map((q, idx) => ({
      questionIndex: idx,
      question: q.question || `Question ${idx + 1}`,
      selectedAnswer: selectedAnswers[idx] || '',
    }));

    const apiRes = await axios
      .post(`${API_BASE}/submit`, {
        quizId,
        userId: userId || null,
        answers: formattedAnswers,
      })
      .catch(() => null);

    if (apiRes?.data?.data?.submissionId) {
      submissionId = apiRes.data.data.submissionId;
    }
    if (Array.isArray(apiRes?.data?.data?.results)) {
      apiResults = apiRes.data.data.results;
    }
  }

  const normalizedQuestions = questions.map((q, idx) => ({
    id: q.id || `q-${idx + 1}`,
    question: q.question || `Question ${idx + 1}`,
    options: Array.isArray(q.options) ? q.options : [],
    correctAnswer: q.correctAnswer || '',
    explanation: q.explanation || '',
    selectedAnswer: selectedAnswers[idx] || '',
  }));

  const resultPayload = {
    submissionId,
    quizId: quizId || null,
    userId: userId || null,
    title: finalTopic,
    topic: finalTopic,
    category: category || 'Most Important (Mixed)',
    difficulty: difficulty || 'Medium',
    durationSeconds: Number(durationSeconds) || 0,
    score: Number(correctCount),
    totalQuestions: Number(questions.length),
    percentage: Number(percentage),
    questions: normalizedQuestions,
    results: apiResults,
    selectedAnswers,
    submittedAt,
    createdAt: submittedAt,
  };

  try {
    const subRaw = localStorage.getItem('quiz_submissions_list');
    const existingSubs = subRaw ? JSON.parse(subRaw) : [];
    const nextSubs = [
      { ...resultPayload, _id: submissionId },
      ...(Array.isArray(existingSubs) ? existingSubs : []),
    ];
    localStorage.setItem('quiz_submissions_list', JSON.stringify(nextSubs.slice(0, 50)));

    const histRaw = localStorage.getItem('quiz_attempts_history');
    const existingHist = histRaw ? JSON.parse(histRaw) : [];
    const safeHist = Array.isArray(existingHist) ? existingHist : [];
    const nextHist = [
      ...safeHist,
      {
        id: submissionId,
        label: `Q${safeHist.length + 1}`,
        topic: finalTopic,
        category: resultPayload.category,
        difficulty: resultPayload.difficulty,
        score: Number(percentage),
        correctCount: Number(correctCount),
        totalQuestions: Number(questions.length),
        submittedAt,
      },
    ];
    localStorage.setItem('quiz_attempts_history', JSON.stringify(nextHist.slice(-20)));
    localStorage.setItem('latest_quiz_result', JSON.stringify(resultPayload));
  } catch (err) {
    console.error('Failed to persist quiz result locally:', err);
  }

  return resultPayload;
};

export const getQuizSubmissions = async (userId) => {
  let localSubs = [];
  try {
    const raw = localStorage.getItem('quiz_submissions_list');
    const parsed = raw ? JSON.parse(raw) : [];
    localSubs = Array.isArray(parsed) ? parsed : [];
  } catch {
    localSubs = [];
  }

  try {
    const res = await axios.get(`${API_BASE}/submissions/all`, {
      params: userId ? { userId } : {},
    });
    const apiSubs = Array.isArray(res.data?.data) ? res.data.data : [];

    return apiSubs.map((sub) => {
      const matchLocal = localSubs.find(
        (loc) =>
          String(loc._id || loc.submissionId || loc.id) === String(sub._id) ||
          (loc.quizId && sub.quizId && String(loc.quizId) === String(sub.quizId))
      );

      if (matchLocal && Array.isArray(matchLocal.questions) && matchLocal.questions.length > 0) {
        return {
          ...sub,
          questions: matchLocal.questions,
          selectedAnswers: matchLocal.selectedAnswers || sub.selectedAnswers || {},
        };
      }
      return sub;
    });
  } catch {
    return localSubs;
  }
};

export const deleteQuizSubmissionById = async (submissionId) => {
  if (!submissionId) return;
  await axios.delete(`${API_BASE}/submissions/${submissionId}`).catch(() => null);

  try {
    const subRaw = localStorage.getItem('quiz_submissions_list');
    const subs = subRaw ? JSON.parse(subRaw) : [];
    if (Array.isArray(subs)) {
      localStorage.setItem(
        'quiz_submissions_list',
        JSON.stringify(
          subs.filter(
            (s) => String(s._id || s.submissionId || s.id) !== String(submissionId)
          )
        )
      );
    }

    const histRaw = localStorage.getItem('quiz_attempts_history');
    const hist = histRaw ? JSON.parse(histRaw) : [];
    if (Array.isArray(hist)) {
      localStorage.setItem(
        'quiz_attempts_history',
        JSON.stringify(hist.filter((h) => String(h.id) !== String(submissionId)))
      );
    }
  } catch (err) {
    console.error('Failed to remove deleted submission from local storage:', err);
  }
};