import fs from 'fs';
import { createRequire } from 'module';
import Flashcard from '../models/Flashcard.js';
import Document from '../models/Document.js';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Repair common JSON issues such as raw newlines, invalid escapes, or truncated tail
const repairJsonString = (raw) => {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
      }
      out += ch;
      continue;
    }

    if (escaped) {
      if (['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u'].includes(ch)) {
        out += ch;
      } else {
        out += '\\' + ch;
      }
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      out += ch;
      continue;
    }

    if (ch === '"') {
      // Check if this quote ends a string value or is an unescaped quote inside text
      let j = i + 1;
      while (j < raw.length && /\s/.test(raw[j])) j++;
      const nextChar = raw[j] || '';
      if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':') {
        inString = false;
        out += ch;
      } else {
        out += '\\"';
      }
      continue;
    }

    if (ch === '\n') {
      out += '\\n';
      continue;
    }

    if (ch === '\r') {
      out += '\\r';
      continue;
    }

    if (ch === '\t') {
      out += '\\t';
      continue;
    }

    out += ch;
  }

  if (escaped) {
    out += '\\';
  }
  if (inString) {
    out += '"';
  }

  return out;
};

// Extract complete { question, answer, difficulty } objects even if JSON is long
const extractCardObjects = (text) => {
  let cleaned = String(text || '').trim();
  cleaned = cleaned
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/, '')
    .replace(/\s*```$/, '')
    .trim();

  const repaired = repairJsonString(cleaned);

  try {
    const parsed = JSON.parse(repaired);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Fallback to object-by-object extraction below
  }

  const objects = [];
  let depth = 0;
  let startIdx = -1;
  let inStr = false;
  let esc = false;

  for (let i = 0; i < repaired.length; i++) {
    const c = repaired[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (c === '\\') {
      esc = true;
      continue;
    }
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;

    if (c === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const chunk = repaired.slice(startIdx, i + 1);
        try {
          const obj = JSON.parse(chunk);
          if (obj && obj.question && obj.answer) {
            objects.push(obj);
          }
        } catch {
          // Skip malformed chunk
        }
        startIdx = -1;
      }
    }
  }

  return objects;
};

// Remove raw LaTeX dollar signs and keep plain readable text
const cleanReadableText = (str) =>
  String(str || '')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\\\/g, '\\')
    .trim();

// Extract text from document file if available
const getDocumentContext = async (document) => {
  let extracted = `Document Title: ${document.title}`;

  if (document.filePath || document.fileName) {
    const candidates = [
      document.filePath,
      `uploads/${document.fileName}`,
      `backend/uploads/${document.fileName}`,
      `./uploads/${document.fileName}`,
      `../uploads/${document.fileName}`,
    ];

    const targetPath = candidates.find((p) => p && fs.existsSync(p));
    if (targetPath) {
      try {
        if (targetPath.toLowerCase().endsWith('.txt')) {
          extracted = fs.readFileSync(targetPath, 'utf-8');
        } else {
          const buffer = fs.readFileSync(targetPath);
          const parser =
            typeof pdfParse === 'function' ? pdfParse : pdfParse.default || pdfParse;
          if (typeof parser === 'function') {
            const parsed = await parser(buffer);
            if (parsed?.text && parsed.text.trim().length > 10) {
              extracted = parsed.text;
            }
          }
        }
      } catch (err) {
        console.warn('Flashcard PDF parse fallback:', err.message);
      }
    }
  }

  return extracted;
};

// Generate custom flashcards in easy words and natural human style
export const generateFlashcards = async (req, res, next) => {
  try {
    const paramId = req.params.id;
    const {
      userId,
      documentId,
      customTopic,
      difficulty = 'medium',
      questionType = 'mixed',
      cardCount = 5,
    } = req.body;

    const resolvedUserId = userId || req.user?.uid || req.user?.id;
    if (!resolvedUserId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API Key not configured in environment variables',
      });
    }

    const safeCount = Math.min(20, Math.max(1, Number(cardCount) || 5));
    const safeDifficulty = ['easy', 'medium', 'hard'].includes(String(difficulty).toLowerCase())
      ? String(difficulty).toLowerCase()
      : 'medium';

    let sourceTitle = customTopic?.trim() || 'Custom Topic Study Set';
    let sourceContext = '';
    const resolvedDocId = documentId || (paramId && paramId !== 'custom' ? paramId : null);

    if (resolvedDocId && resolvedDocId !== 'custom') {
      const doc = await Document.findById(resolvedDocId);
      if (!doc) {
        return res.status(404).json({
          success: false,
          error: 'Document not found',
        });
      }
      sourceTitle = doc.title;
      sourceContext = await getDocumentContext(doc);
    } else if (customTopic && customTopic.trim()) {
      sourceContext = `Topic to study: ${customTopic.trim()}.`;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please select a document or provide a custom topic',
      });
    }

    const typeInstructionMap = {
      mixed: 'Mix key definitions, how things work, comparisons, and practical exam questions.',
      definition: 'Focus on clear, simple definitions of important terms.',
      concept: 'Focus on explaining how key ideas work in everyday language.',
      comparison: 'Focus on clear differences and trade-offs between important concepts.',
      application: 'Focus on realistic exam and problem-solving situations.',
    };

    const typeGuide = typeInstructionMap[questionType] || typeInstructionMap.mixed;

    const prompt = [
      `You are a friendly tutor helping a student study. Create ${safeCount} important flashcards.`,
      'Pick only the most important exam-worthy questions. Skip minor or filler details.',
      'Write in easy, everyday English words and a warm, natural human tone, like a helpful study partner explaining things clearly.',
      'Do not use LaTeX dollar signs like $b=4$ or complex math formatting. Write plain readable text such as "branching factor b = 4".',
      'Keep answers clear and easy to follow (2 to 4 sentences). When listing points, use simple bullet lines starting with "- ".',
      `Difficulty level: ${safeDifficulty.toUpperCase()}`,
      `Question style: ${typeGuide}`,
      `Source title: ${sourceTitle}`,
      'Study content:',
      sourceContext.substring(0, 16000),
      'Return ONLY a valid JSON array of objects with these exact keys:',
      '- "question": string',
      '- "answer": string',
      `- "difficulty": "${safeDifficulty}"`,
    ].join('\n');

    const baseEndpoint = 'https://generativelanguage.googleapis.com/v1beta/models/';
    const geminiUrl = `${baseEndpoint}${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.45,
        },
      }),
    });

    const apiData = await apiResponse.json();

    if (apiData.error) {
      console.error('Gemini API Error:', apiData.error);
      return res.status(500).json({
        success: false,
        error: apiData.error.message || 'Gemini API error',
      });
    }

    const rawText = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsedCards = extractCardObjects(rawText);

    if (!Array.isArray(parsedCards) || parsedCards.length === 0) {
      throw new Error('AI returned an invalid flashcard list');
    }

    const formattedCards = parsedCards
      .slice(0, safeCount)
      .map((item) => ({
        question: cleanReadableText(item.question),
        answer: cleanReadableText(item.answer),
        difficulty: ['easy', 'medium', 'hard'].includes(String(item.difficulty || '').toLowerCase())
          ? String(item.difficulty).toLowerCase()
          : safeDifficulty,
      }))
      .filter((c) => c.question && c.answer);

    if (formattedCards.length === 0) {
      throw new Error('Could not build valid flashcards from AI output');
    }

    const savedSet = await Flashcard.create({
      userId: String(resolvedUserId),
      documentId: resolvedDocId ? String(resolvedDocId) : `topic:${sourceTitle}`,
      cards: formattedCards,
    });

    return res.status(201).json({
      success: true,
      message: 'Flashcards generated successfully',
      data: {
        _id: savedSet._id,
        title: sourceTitle,
        flashcards: savedSet.cards,
        cards: savedSet.cards,
      },
    });
  } catch (error) {
    console.error('Generate Flashcards Error:', error);
    next(error);
  }
};

// Get all flashcard sets belonging to a specific user
export const getFlashcardsByUser = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const sets = await Flashcard.find({ userId: String(userId) }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: Number(sets.length),
      data: sets,
    });
  } catch (error) {
    next(error);
  }
};

// Delete a flashcard set by ID
export const deleteFlashcard = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await Flashcard.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Flashcard set not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Flashcard set deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};