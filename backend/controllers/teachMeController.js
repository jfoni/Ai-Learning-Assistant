import { GoogleGenerativeAI } from '@google/generative-ai';
import TeachMeSession from '../models/TeachMeSession.js';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const VALID_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);

const extractJsonObject = (rawText = '') => {
  const cleaned = String(rawText).replace(/```json|```/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const normalizeList = (val) => {
  if (!Array.isArray(val)) return [];
  return val
    .map((item) => String(item || '').trim())
    .filter(Boolean);
};

export const evaluateExplanationController = async (req, res) => {
  try {
    const {
      userId,
      topic = '',
      sourceType = 'manual',
      documentId = '',
      documentTitle = '',
      documentContent = '',
      difficulty = 'Beginner',
      explanation = '',
    } = req.body || {};

    if (!userId || String(userId).trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to save and evaluate teaching sessions.',
      });
    }

    const cleanTopic = String(topic || '').trim();
    const cleanExplanation = String(explanation || '').trim();
    const safeDifficulty = VALID_DIFFICULTIES.has(difficulty)
      ? difficulty
      : 'Beginner';

    if (!cleanTopic) {
      return res.status(400).json({
        success: false,
        message: 'Please enter or select a topic first.',
      });
    }

    if (!cleanExplanation || cleanExplanation.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Please explain the concept in your own words before submitting.',
      });
    }

    if (!genAI) {
      return res.status(503).json({
        success: false,
        message: 'Gemini API key is not configured on the server.',
      });
    }

    const docExcerpt =
      sourceType === 'document' && documentContent
        ? String(documentContent).slice(0, 9000)
        : '';

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

    const prompt = `
You are a friendly, patient, and knowledgeable teacher in "AI Teach Me Mode".
A student is explaining a concept in their own words to test real understanding. Do NOT expect verbatim textbook definitions.
Be encouraging without fake or meaningless praise. Never mark an incorrect explanation as correct.
Clearly separate factual errors/misconceptions from missing details.

Topic: ${cleanTopic}
Difficulty Level: ${safeDifficulty}
Source Type: ${sourceType === 'document' ? `Document (${documentTitle || 'Uploaded Document'})` : 'Manual Topic'}
${docExcerpt ? `Reference Document Excerpt:\n"""\n${docExcerpt}\n"""\n` : ''}
Student's Own-Words Explanation:
"""
${cleanExplanation}
"""

Return ONLY valid JSON matching this exact structure:
{
  "score": <number between 0 and 100 reflecting true conceptual accuracy and completeness for ${safeDifficulty} level>,
  "summary": "<short supportive teacher overview in simple language>",
  "explainedCorrectly": ["<accurate point the student explained well>"],
  "missingPoints": ["<important detail omitted for ${safeDifficulty} level>"],
  "misconceptions": ["<factual error or misconception in the student's explanation>"],
  "improvementTips": ["<actionable tip to improve clarity, structure, or examples>"],
  "correctedExplanation": "<clear, accurate explanation at ${safeDifficulty} level with a relatable example>",
  "followUpQuestion": "<one thoughtful follow-up question to probe deeper understanding>"
}
`;

    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result?.response?.text() || '');

    if (!parsed) {
      return res.status(502).json({
        success: false,
        message: 'Could not parse structured teacher evaluation. Please try again.',
      });
    }

    const clampedScore = Math.max(
      0,
      Math.min(100, Math.round(Number(parsed.score) || 0))
    );

    const evaluation = {
      score: clampedScore,
      summary: String(parsed.summary || '').trim(),
      explainedCorrectly: normalizeList(parsed.explainedCorrectly),
      missingPoints: normalizeList(parsed.missingPoints),
      misconceptions: normalizeList(parsed.misconceptions),
      improvementTips: normalizeList(parsed.improvementTips),
      correctedExplanation: String(parsed.correctedExplanation || '').trim(),
      followUpQuestion: String(parsed.followUpQuestion || '').trim(),
    };

    const session = await TeachMeSession.create({
      userId: String(userId).trim(),
      topic: cleanTopic,
      sourceType: sourceType === 'document' ? 'document' : 'manual',
      documentId: sourceType === 'document' ? String(documentId || '') : '',
      documentTitle: sourceType === 'document' ? String(documentTitle || '') : '',
      difficulty: safeDifficulty,
      explanation: cleanExplanation,
      evaluation,
      dialogue: evaluation.followUpQuestion
        ? [
            {
              role: 'Ai Tutor',
              actionType: 'evaluate',
              content: evaluation.followUpQuestion,
            },
          ]
        : [],
    });

    return res.status(201).json({
      success: true,
      session,
    });
  } catch (err) {
    console.error('Teach Me evaluate error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to evaluate explanation.',
    });
  }
};

export const interactTeachMeController = async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      interactionType = 'answer_followup',
      studentReply = '',
      confusingPart = '',
    } = req.body || {};

    if (!userId || String(userId).trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required.',
      });
    }

    const session = await TeachMeSession.findOne({
      _id: sessionId,
      userId: String(userId).trim(),
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Teaching session not found for this user.',
      });
    }

    if (!genAI) {
      return res.status(503).json({
        success: false,
        message: 'Gemini API key is not configured on the server.',
      });
    }

    if (interactionType === 'answer_followup' && !String(studentReply || '').trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please write your answer to the follow-up question.',
      });
    }

    const recentDialogue = (session.dialogue || [])
      .slice(-8)
      .map((d) => `${d.role.toUpperCase()} (${d.actionType}): ${d.content}`)
      .join('\n');

    let directive = '';
    let studentLogContent = '';

    if (interactionType === 'hint') {
      studentLogContent = confusingPart?.trim()
        ? `Requested a hint regarding: ${confusingPart.trim()}`
        : 'Requested a hint for the concept/follow-up question.';
      directive =
        'Give a helpful hint in simple language with a relatable analogy to guide the student. Do NOT reveal the full final answer immediately.';
    } else if (interactionType === 'clarify') {
      const partText =
        String(confusingPart || '').trim() ||
        'the confusing part of this topic';
      studentLogContent = `Asked to explain confusing part: ${partText}`;
      directive = `Explain "${partText}" in simple, patient teacher language using a relatable example. Keep it clear and encouraging without fake praise.`;
    } else if (interactionType === 'corrected_explanation') {
      studentLogContent = 'Requested a full corrected explanation.';
      directive =
        'Provide a clear, accurate, well-structured corrected explanation suitable for the student’s difficulty level, including a relatable example and noting key distinctions.';
    } else {
      studentLogContent = String(studentReply).trim();
      directive =
        'Evaluate the student’s follow-up answer kindly and honestly. Point out what is right, gently correct any misconception without marking wrong ideas as right, give a practical example if helpful, and ask one next check-for-understanding question.';
    }

    session.dialogue.push({
      role: 'student',
      actionType: interactionType,
      content: studentLogContent,
    });

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });
    const prompt = `
You are a friendly, patient, and knowledgeable teacher in "AI Teach Me Mode".
Topic: ${session.topic}
Difficulty Level: ${session.difficulty}
Student's Original Explanation: """${session.explanation}"""
Initial Evaluation Summary: ${session.evaluation?.summary || ''}
Misconceptions Noted Earlier: ${(session.evaluation?.misconceptions || []).join('; ') || 'None'}
Missing Points Noted Earlier: ${(session.evaluation?.missingPoints || []).join('; ') || 'None'}

Recent Dialogue:
${recentDialogue || 'None yet.'}

Teacher Task:
${directive}

Write plain, clean text using short paragraphs or simple "- " bullet lines. Avoid raw markdown junk symbols like #, *, \`, or $.
`;

    const result = await model.generateContent(prompt);
    const teacherReply = (result?.response?.text() || '')
      .replace(/[#*`~$]/g, '')
      .trim();

    session.dialogue.push({
      role: 'teacher',
      actionType: interactionType,
      content: teacherReply || 'Let us walk through this idea together.',
    });

    await session.save();

    return res.json({
      success: true,
      session,
    });
  } catch (err) {
    console.error('Teach Me interact error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to continue teacher interaction.',
    });
  }
};

export const getTeachMeHistoryController = async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterUid = req.query?.userId || userId;

    if (!userId || String(requesterUid) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to learning history.',
      });
    }

    const sessions = await TeachMeSession.find({ userId: String(userId).trim() })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      sessions,
    });
  } catch (err) {
    console.error('Teach Me history error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load teaching history.',
    });
  }
};

export const getTeachMeSessionByIdController = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.query?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated userId is required.',
      });
    }

    const session = await TeachMeSession.findOne({
      _id: sessionId,
      userId: String(userId).trim(),
    }).lean();

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.',
      });
    }

    return res.json({
      success: true,
      session,
    });
  } catch (err) {
    console.error('Teach Me session fetch error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load session.',
    });
  }
};