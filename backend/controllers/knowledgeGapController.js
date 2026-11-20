import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const categorizeTopic = (avgPct, totalAttempts) => {
  if (totalAttempts < 1) return 'Insufficient Data';
  if (avgPct >= 75) return 'Strong';
  if (avgPct >= 50) return 'Needs Improvement';
  return 'Weak';
};

const buildTopicSummaries = (submissions = [], documents = []) => {
  const map = new Map();

  for (const sub of submissions) {
    const rawTopic = String(sub.topic || sub.title || 'General Study').trim();
    const key = rawTopic.toLowerCase();

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

    const wrongQ = Math.max(0, totalQ - correctQ);

    const pct =
      typeof sub.percentage === 'number' && !Number.isNaN(sub.percentage)
        ? Math.min(100, Math.max(0, Math.round(sub.percentage)))
        : totalQ > 0
        ? Math.min(100, Math.max(0, Math.round((correctQ / totalQ) * 100)))
        : 0;

    const sampleMistakes = Array.isArray(sub.questions)
      ? sub.questions
          .filter(
            (q) =>
              q.correctAnswer &&
              String(q.selectedAnswer || '').trim() !==
                String(q.correctAnswer || '').trim()
          )
          .slice(0, 3)
          .map((q) => ({
            question: q.question,
            selectedAnswer: q.selectedAnswer || 'Not answered',
            correctAnswer: q.correctAnswer,
          }))
      : [];

    if (!map.has(key)) {
      map.set(key, {
        topic: rawTopic,
        attempts: 0,
        totalQuestions: 0,
        correctQuestions: 0,
        wrongQuestions: 0,
        scores: [],
        recentMistakes: [],
        lastAttemptedAt: sub.submittedAt || sub.createdAt || null,
      });
    }

    const entry = map.get(key);
    entry.attempts += 1;
    entry.totalQuestions += totalQ;
    entry.correctQuestions += correctQ;
    entry.wrongQuestions += wrongQ;
    entry.scores.push(pct);
    entry.recentMistakes = [...sampleMistakes, ...entry.recentMistakes].slice(0, 4);

    const currentDate = new Date(sub.submittedAt || sub.createdAt || 0).getTime();
    const prevDate = new Date(entry.lastAttemptedAt || 0).getTime();
    if (currentDate >= prevDate && (sub.submittedAt || sub.createdAt)) {
      entry.lastAttemptedAt = sub.submittedAt || sub.createdAt;
    }
  }

  return Array.from(map.values()).map((item) => {
    const avgPercentage =
      item.scores.length > 0
        ? Math.round(item.scores.reduce((a, b) => a + b, 0) / item.scores.length)
        : 0;

    const latestPercentage =
      item.scores.length > 0 ? item.scores[item.scores.length - 1] : 0;

    const previousPercentage =
      item.scores.length > 1 ? item.scores[item.scores.length - 2] : null;

    const progressDelta =
      previousPercentage !== null ? latestPercentage - previousPercentage : null;

    const matchedDoc = Array.isArray(documents)
      ? documents.find((doc) => {
          const title = String(doc.title || '').toLowerCase();
          const tLower = item.topic.toLowerCase();
          return title.includes(tLower) || tLower.includes(title.split('.')[0]);
        })
      : null;

    return {
      ...item,
      avgPercentage,
      latestPercentage,
      progressDelta,
      category: categorizeTopic(avgPercentage, item.attempts),
      recommendedDocument: matchedDoc
        ? { id: matchedDoc._id || matchedDoc.id, title: matchedDoc.title }
        : null,
    };
  });
};

export const analyzeKnowledgeGapsController = async (req, res) => {
  try {
    const { userId, submissions = [], documents = [] } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to analyze personal learning data.',
      });
    }

    const userSubmissions = (Array.isArray(submissions) ? submissions : []).filter(
      (s) => !s.userId || String(s.userId) === String(userId)
    );

    if (userSubmissions.length === 0) {
      return res.json({
        success: true,
        hasEnoughData: false,
        topics: [],
        aiInsights: null,
      });
    }

    const topics = buildTopicSummaries(userSubmissions, documents).sort(
      (a, b) => a.avgPercentage - b.avgPercentage
    );

    const weakOrNeedsWork = topics.filter((t) => t.category !== 'Strong');

    let aiInsights = null;

    if (genAI && weakOrNeedsWork.length > 0) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
        const prompt = `
You are an academic learning analyst. Analyze ONLY the student's actual quiz performance below. Do not invent facts or grades.
Return strict JSON with keys:
- "summary": concise 2-sentence overview of knowledge gaps
- "topicAnalyses": array of {
    "topic": string,
    "whyDifficult": string,
    "possibleMisunderstanding": string,
    "studyAdvice": string,
    "flashcardFocus": string
  }

Student Topic Data:
${JSON.stringify(
  weakOrNeedsWork.map((t) => ({
    topic: t.topic,
    category: t.category,
    avgPercentage: t.avgPercentage,
    attempts: t.attempts,
    wrongQuestions: t.wrongQuestions,
    recentMistakes: t.recentMistakes,
  }))
)}
`;
        const response = await model.generateContent(prompt);
        const rawText = response.response.text() || '';
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiInsights = JSON.parse(jsonMatch[0]);
        }
      } catch (aiErr) {
        console.warn('Knowledge gap AI fallback used:', aiErr.message);
      }
    }

    if (!aiInsights) {
      aiInsights = {
        summary:
          weakOrNeedsWork.length > 0
            ? `Focus first on ${weakOrNeedsWork
                .slice(0, 2)
                .map((t) => t.topic)
                .join(' and ')}, where accuracy is lower across recent attempts.`
            : 'Your recent quiz scores are strong across tracked topics. Continue regular spaced revision.',
        topicAnalyses: weakOrNeedsWork.map((t) => ({
          topic: t.topic,
          whyDifficult: `${t.wrongQuestions} out of ${t.totalQuestions} questions were missed across ${t.attempts} attempt(s).`,
          possibleMisunderstanding: t.recentMistakes[0]?.question
            ? `Review question pattern around "${t.recentMistakes[0].question}".`
            : 'Core definitions or edge conditions may need a second pass.',
          studyAdvice: `Re-read ${t.topic} notes, review missed explanations, and attempt a focused practice set.`,
          flashcardFocus: `Create concise flashcards for key terms and rules in ${t.topic}.`,
        })),
      };
    }

    return res.json({
      success: true,
      hasEnoughData: true,
      totalSubmissionsAnalyzed: userSubmissions.length,
      topics,
      aiInsights,
    });
  } catch (err) {
    console.error('Knowledge gap analysis error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to analyze knowledge gaps.',
    });
  }
};