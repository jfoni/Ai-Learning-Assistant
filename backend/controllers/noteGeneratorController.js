import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import StudyNote from '../models/StudyNote.js';
import Document from '../models/Document.js';
import { extractTextFromPdfWithFallback } from '../utils/pdfParser.js';
import { chunkText } from '../utils/textChunker.js';

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
];

const VALID_NOTE_TYPES = new Set([
  'Detailed Study Notes',
  'Complete Study Notes',
  'Short Revision Notes',
  'Quick Revision Notes',
  'Exam Preparation Notes',
  'Topic-wise Notes',
]);

const VALID_LEVELS = new Set([
  'Simple',
  'Beginner',
  'Intermediate',
  'Detailed',
  'Advanced',
]);

const VALID_LANGUAGES = new Set(['English', 'Bangla', 'Bangla-English']);
const VALID_SCOPES = new Set(['entire', 'topic', 'selected_topics']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getRequesterUserId(req) {
  return String(
    req.user?.uid ||
      req.user?.id ||
      req.body?.userId ||
      req.query?.userId ||
      ''
  ).trim();
}

function cleanDisplayText(raw = '') {
  return String(raw || '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanCodeText(raw = '') {
  return String(raw || '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .trim();
}

function toCleanArray(val, isCode = false) {
  if (!Array.isArray(val)) return [];
  return val
    .map((v) => (isCode ? cleanCodeText(v) : cleanDisplayText(v)))
    .filter(Boolean);
}

function extractJsonObject(rawText = '') {
  const cleaned = String(rawText || '')
    .replace(/```json|```/gi, '')
    .trim();
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx === -1) return null;

  let candidate =
    endIdx > startIdx
      ? cleaned.slice(startIdx, endIdx + 1)
      : cleaned.slice(startIdx);

  candidate = candidate.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(candidate);
  } catch {
    let fixed = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < candidate.length; i += 1) {
      const ch = candidate[i];
      if (escaped) {
        fixed += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        fixed += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        fixed += ch;
        continue;
      }
      if (inString && (ch === '\n' || ch === '\r' || ch === '\t')) {
        if (ch === '\n') fixed += '\\n';
        else if (ch === '\r') fixed += '\\r';
        else fixed += '\\t';
        continue;
      }
      fixed += ch;
    }

    if (inString) fixed += '"';
    fixed = fixed.replace(/,\s*([}\]])/g, '$1');

    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    if (closeBraces < openBraces) {
      fixed += '}'.repeat(openBraces - closeBraces);
    }

    try {
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

function buildFallbackParsedFromText(rawText = '', fallbackTitle = 'Study Notes') {
  const text = cleanDisplayText(rawText);
  if (!text) return null;

  return {
    title: cleanDisplayText(fallbackTitle),
    subject: cleanDisplayText(fallbackTitle),
    sections: [
      {
        topicNumber: 1,
        heading: cleanDisplayText(fallbackTitle),
        pageOrSlideRef: '',
        sourceBasis: 'source_grounded',
        explanation: text.slice(0, 25000),
        bulletPoints: [],
        steps: [],
        typesOrClassifications: [],
        advantages: [],
        disadvantages: [],
        comparisons: [],
        formulas: [],
        examples: [],
        codeSnippet: '',
      },
    ],
    definitions: [],
    keyConcepts: [],
    formulas: [],
    examples: [],
    importantPoints: [],
    sourceLimitations: [],
  };
}

async function callGeminiText(prompt) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const uniqueModels = [...new Set(MODEL_CANDIDATES.filter(Boolean))];
  let lastError = null;

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    for (const modelName of uniqueModels) {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
          });
          const text = String(response?.text || '').trim();
          if (text) return text;
        } catch (err) {
          lastError = err;
          const msg = String(err?.message || '').toLowerCase();
          const isTransient =
            msg.includes('high demand') ||
            msg.includes('overloaded') ||
            msg.includes('unavailable') ||
            msg.includes('503') ||
            msg.includes('429');
          if (!isTransient || attempt === 2) break;
          await sleep(700 * attempt);
        }
      }
    }
  } catch (sdkErr) {
    lastError = sdkErr;
  }

  for (const modelName of uniqueModels) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
          throw new Error(
            data?.error?.message ||
              `Gemini request failed (${response.status}) on ${modelName}`
          );
        }

        const text = String(
          data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        ).trim();
        if (text) return text;
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || '').toLowerCase();
        const isTransient =
          msg.includes('high demand') ||
          msg.includes('overloaded') ||
          msg.includes('unavailable') ||
          msg.includes('503') ||
          msg.includes('429');
        if (!isTransient || attempt === 2) break;
        await sleep(700 * attempt);
      }
    }
  }

  throw lastError || new Error('All Gemini models failed to respond.');
}

function resolveExistingFilePath(doc) {
  const rawPath = String(
    doc?.filePath ||
      doc?.path ||
      doc?.filepath ||
      doc?.storagePath ||
      doc?.file ||
      ''
  ).trim();

  if (!rawPath) return '';

  const candidates = [
    rawPath,
    path.resolve(process.cwd(), rawPath),
    path.resolve(process.cwd(), 'backend', rawPath),
    path.resolve(process.cwd(), 'uploads', path.basename(rawPath)),
    path.resolve(process.cwd(), 'backend', 'uploads', path.basename(rawPath)),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

function extractAnyTextFromDoc(doc) {
  if (!doc || typeof doc !== 'object') return '';
  for (const field of [
    doc.extractedText,
    doc.content,
    doc.text,
    doc.rawText,
    doc.pdfText,
    doc.body,
    doc.summary,
  ]) {
    if (typeof field === 'string' && field.trim().length > 0) {
      return field.trim();
    }
  }
  return '';
}

async function resolveDocumentAndSource({
  uid,
  documentId,
  documentTitle,
  documentContent,
}) {
  let docRecord = null;
  let content = String(documentContent || '').trim();
  let resolvedTitle = String(documentTitle || '').trim();
  let fileFormat = String(
    resolvedTitle.split('.').pop() || 'document'
  ).toLowerCase();
  let totalPagesOrSlides = null;
  let warnings = [];
  let resolvedFilePath = '';

  if (documentId && mongoose.Types.ObjectId.isValid(String(documentId))) {
    docRecord = await Document.findById(String(documentId).trim()).lean();
    if (docRecord) {
      if (docRecord.userId && String(docRecord.userId) !== String(uid)) {
        const err = new Error('Unauthorized access to this document.');
        err.statusCode = 403;
        throw err;
      }

      resolvedTitle =
        resolvedTitle ||
        docRecord.title ||
        docRecord.originalFileName ||
        docRecord.fileName ||
        'Lecture Document';

      fileFormat =
        docRecord.fileFormat ||
        String(
          (
            docRecord.originalFileName ||
            docRecord.fileName ||
            resolvedTitle ||
            'document'
          )
            .split('.')
            .pop() || 'document'
        ).toLowerCase();

      totalPagesOrSlides = docRecord.totalPagesOrSlides ?? null;
      warnings = Array.isArray(docRecord.extractionWarnings)
        ? docRecord.extractionWarnings
        : [];

      const storedText = extractAnyTextFromDoc(docRecord);
      if (storedText.length > content.length) {
        content = storedText;
      }

      resolvedFilePath = resolveExistingFilePath(docRecord);

      if (content.length < 300 && resolvedFilePath) {
        try {
          const extMod = await import('../utils/documentExtractor.js');
          if (typeof extMod?.extractDocumentContent === 'function') {
            const extracted = await extMod.extractDocumentContent({
              filePath: resolvedFilePath,
              fileName:
                docRecord.originalFileName ||
                docRecord.fileName ||
                resolvedTitle,
            });
            const extText = String(extracted?.extractedText || '').trim();
            if (extText.length > content.length) {
              content = extText;
            }
            totalPagesOrSlides =
              extracted?.totalPagesOrSlides ?? totalPagesOrSlides;
            warnings = [
              ...new Set([...warnings, ...(extracted?.warnings || [])]),
            ];
          }
        } catch {
          // Fallback to pdfParser below
        }

        if (content.length < 300) {
          const deepText = String(
            (await extractTextFromPdfWithFallback(resolvedFilePath)) || ''
          ).trim();
          if (deepText.length > content.length) {
            content = deepText;
          }
        }
      }
    }
  }

  return {
    docRecord,
    resolvedTitle: resolvedTitle || 'Lecture Document',
    fileFormat,
    content,
    totalPagesOrSlides,
    warnings,
  };
}

export async function analyzeDocumentContent({
  documentTitle,
  fileFormat,
  content,
  totalPagesOrSlides = null,
  warnings = [],
}) {
  const chunks = chunkText(content, 12000, 700);
  const chunkSummaries = [];

  for (const chunk of chunks.slice(0, 8)) {
    const chunkPrompt = `
Analyze part ${chunk.index + 1} of ${chunk.total} of "${documentTitle}" (${fileFormat}).
Identify:
1. Subject area
2. Topics, subtopics, and any questions/answers in order of appearance
3. Page or slide numbers ONLY if explicitly shown in the text; otherwise use ""
4. Topic relationships and any unreadable/incomplete parts.

Text:
"""
${chunk.content}
"""

Return ONLY valid JSON:
{
  "subject": "<subject>",
  "topics": [
    {
      "title": "<topic title>",
      "subtopics": ["<subtopic>"],
      "pageOrSlideRef": "<explicit page/slide ref or empty string>"
    }
  ],
  "relationships": ["<how topics connect>"],
  "unreadableOrMissing": ["<any garbled/missing part>"]
}
`;
    try {
      const raw = await callGeminiText(chunkPrompt);
      const parsed = extractJsonObject(raw);
      if (parsed) chunkSummaries.push(parsed);
    } catch {
      // Continue if one chunk fails
    }
  }

  const mergedTopics = [];
  const seenTitles = new Set();
  const relationships = [];
  const unreadable = [...warnings];
  let subject = '';

  for (const part of chunkSummaries) {
    if (!subject && part.subject) {
      subject = cleanDisplayText(part.subject);
    }
    for (const rel of toCleanArray(part.relationships)) {
      if (!relationships.includes(rel)) relationships.push(rel);
    }
    for (const bad of toCleanArray(part.unreadableOrMissing)) {
      if (!unreadable.includes(bad)) unreadable.push(bad);
    }
    for (const t of Array.isArray(part.topics) ? part.topics : []) {
      const title = cleanDisplayText(t?.title);
      if (!title) continue;
      const key = title.toLowerCase();
      if (seenTitles.has(key)) continue;
      seenTitles.add(key);
      mergedTopics.push({
        number: mergedTopics.length + 1,
        title,
        subtopics: toCleanArray(t?.subtopics),
        pageOrSlideRef: cleanDisplayText(t?.pageOrSlideRef),
      });
    }
  }

  return {
    documentName: cleanDisplayText(documentTitle),
    documentType: cleanDisplayText(fileFormat || 'document'),
    subject: subject || cleanDisplayText(documentTitle),
    totalPagesOrSlides,
    totalDetectedTopics: mergedTopics.length,
    detectedTopics: mergedTopics,
    topicRelationships: relationships,
    unreadableOrMissing: unreadable,
  };
}

function buildFormattedNoteText(noteObj) {
  const lines = [];
  lines.push(cleanDisplayText(noteObj.title));
  if (noteObj.subject) lines.push(`Subject: ${cleanDisplayText(noteObj.subject)}`);
  lines.push('');

  for (const [idx, sec] of (noteObj.sections || []).entries()) {
    const num = sec.topicNumber || idx + 1;
    const headingClean = cleanDisplayText(sec.heading || `Topic ${num}`);
    lines.push(`${num}. ${headingClean}`);

    if (sec.definition) {
      lines.push(`Definition: ${cleanDisplayText(sec.definition)}`);
    }
    if (sec.explanation) {
      lines.push(cleanDisplayText(sec.explanation));
    }
    if (sec.workingPrinciple) {
      lines.push(`Working Principle: ${cleanDisplayText(sec.workingPrinciple)}`);
    }
    for (const bp of toCleanArray(sec.bulletPoints)) {
      lines.push(bp);
    }
    for (const st of toCleanArray(sec.steps)) {
      lines.push(st);
    }
    for (const tp of toCleanArray(sec.typesOrClassifications)) {
      lines.push(tp);
    }
    for (const cmp of toCleanArray(sec.comparisons)) {
      lines.push(cmp);
    }
    for (const fm of toCleanArray(sec.formulas)) {
      lines.push(fm);
    }
    for (const ex of toCleanArray(sec.examples)) {
      lines.push(ex);
    }
    if (sec.codeSnippet) {
      lines.push(cleanCodeText(sec.codeSnippet));
    }
    if (sec.aiSupplementaryNote) {
      lines.push(
        `Additional Note: ${cleanDisplayText(sec.aiSupplementaryNote)}`
      );
    }
    lines.push('');
  }

  if (noteObj.importantPoints?.length) {
    lines.push('Important Points to Remember');
    for (const pt of toCleanArray(noteObj.importantPoints)) {
      lines.push(pt);
    }
  }

  return lines.join('\n').trim();
}

export const analyzeDocumentController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to analyze documents.',
      });
    }

    const {
      documentId = '',
      documentTitle = '',
      documentContent = '',
    } = req.body || {};

    const resolved = await resolveDocumentAndSource({
      uid,
      documentId,
      documentTitle,
      documentContent,
    });

    if (!resolved.content || resolved.content.length < 80) {
      return res.status(400).json({
        success: false,
        message:
          'Unable to extract enough readable text from this file. Please try again or re-upload a clear document.',
        warnings: resolved.warnings,
      });
    }

    const overview = await analyzeDocumentContent({
      documentTitle: resolved.resolvedTitle,
      fileFormat: resolved.fileFormat,
      content: resolved.content,
      totalPagesOrSlides: resolved.totalPagesOrSlides,
      warnings: resolved.warnings,
    });

    return res.json({ success: true, overview });
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: err?.message || 'Failed to analyze document.',
    });
  }
};

export const generateStudyNoteController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to generate and save study notes.',
      });
    }

    const {
      documentId = '',
      documentTitle = '',
      documentContent = '',
      content = '',
      text = '',
      extractedText = '',
      topicScope = 'entire',
      topic = '',
      selectedTopics = [],
      noteType = 'Detailed Study Notes',
      explanationLevel = '',
      difficulty = 'Intermediate',
      language = 'English',
      overview: providedOverview = null,
    } = req.body || {};

    const incomingContent =
      String(documentContent || '').trim() ||
      String(content || '').trim() ||
      String(text || '').trim() ||
      String(extractedText || '').trim();

    const resolved = await resolveDocumentAndSource({
      uid,
      documentId,
      documentTitle,
      documentContent: incomingContent,
    });

    if (!resolved.content || resolved.content.length < 80) {
      return res.status(400).json({
        success: false,
        message:
          'Could not read lecture content from the document right now. Please try generating again in a moment.',
        warnings: resolved.warnings,
      });
    }

    const safeScope = VALID_SCOPES.has(topicScope) ? topicScope : 'entire';
    const cleanTopic = String(topic || '').trim();
    const chosenTopics = toCleanArray(selectedTopics);

    if (safeScope === 'topic' && !cleanTopic) {
      return res.status(400).json({
        success: false,
        message: 'Please specify a topic when generating topic-wise notes.',
      });
    }

    if (safeScope === 'selected_topics' && chosenTopics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one topic to generate notes for.',
      });
    }

    const safeNoteType = VALID_NOTE_TYPES.has(noteType)
      ? noteType
      : 'Detailed Study Notes';
    const rawLevel = String(explanationLevel || difficulty || 'Intermediate');
    const safeLevel = VALID_LEVELS.has(rawLevel) ? rawLevel : 'Intermediate';
    const safeLanguage = VALID_LANGUAGES.has(language) ? language : 'English';

    const overview =
      providedOverview && Array.isArray(providedOverview.detectedTopics)
        ? providedOverview
        : {
            documentName: cleanDisplayText(resolved.resolvedTitle),
            documentType: cleanDisplayText(resolved.fileFormat || 'document'),
            subject: cleanDisplayText(resolved.resolvedTitle),
            totalPagesOrSlides: resolved.totalPagesOrSlides,
            totalDetectedTopics: 0,
            detectedTopics: [],
            topicRelationships: [],
            unreadableOrMissing: resolved.warnings,
          };

    const scopeInstruction =
      safeScope === 'topic'
        ? `Write a complete, well-structured study note on "${cleanTopic}" from the material.`
        : safeScope === 'selected_topics'
          ? `Write a complete, well-structured study note covering ONLY these selected topics in order: ${chosenTopics.join(
              ', '
            )}.`
          : 'Write a complete, thorough study note covering EVERY chapter, topic, subtopic, definition, comparison, formula/complexity, example, and end-of-document question and answer in logical order without skipping anything.';

    const prompt = `
You are a helpful university study assistant creating clean, well-structured, easy-to-read lecture notes strictly from the provided source document.

RULES:
1. Cover every topic, subtopic, definition, key point, formula/complexity, example, and end-of-document question and answer in logical order.
2. Write clear, complete sentences and well-organized points—never dump raw JSON strings or clipped fragments.
3. Keep code snippets clean and valid with proper syntax (such as pointers, brackets, and loop bounds).
4. Do not invent facts outside the source material; place any helpful extra context only inside aiSupplementaryNote.
5. ${scopeInstruction}
6. Note Type: ${safeNoteType} | Explanation Level: ${safeLevel} | Language: ${safeLanguage}.

Document Title: ${resolved.resolvedTitle}
Source Content:
"""
${resolved.content.slice(0, 90000)}
"""

Return ONLY valid JSON:
{
  "title": "<clear study note title>",
  "subject": "<subject name>",
  "sections": [
    {
      "topicNumber": 1,
      "heading": "<clear topic heading>",
      "definition": "<concise definition if applicable>",
      "explanation": "<clear explanation covering subtopics>",
      "bulletPoints": ["<key point>"],
      "steps": ["<step if applicable>"],
      "workingPrinciple": "<how it works if applicable>",
      "typesOrClassifications": ["<type or classification>"],
      "comparisons": ["<comparison point>"],
      "formulas": ["<formula or complexity>"],
      "examples": ["<example or Q&A>"],
      "codeSnippet": "<clean code example if present in source>",
      "aiSupplementaryNote": "<optional helpful note>"
    }
  ],
  "importantPoints": ["<key exam takeaway>"]
}
`;

    const rawText = await callGeminiText(prompt);
    const parsed =
      extractJsonObject(rawText) ||
      buildFallbackParsedFromText(
        rawText,
        `${resolved.resolvedTitle} Study Notes`
      );

    if (
      !parsed ||
      !Array.isArray(parsed.sections) ||
      parsed.sections.length === 0
    ) {
      return res.status(502).json({
        success: false,
        message:
          'Failed to structure study notes from the AI response. Please try again.',
      });
    }

    const sections = parsed.sections.map((sec, idx) => ({
      topicNumber: Number(sec?.topicNumber) || idx + 1,
      heading: cleanDisplayText(sec?.heading || `Topic ${idx + 1}`),
      pageOrSlideRef: '',
      sourceBasis: 'source_grounded',
      subheadings: [],
      definition: cleanDisplayText(sec?.definition),
      explanation: cleanDisplayText(sec?.explanation),
      keyConcepts: [],
      characteristics: [],
      bulletPoints: toCleanArray(sec?.bulletPoints),
      steps: toCleanArray(sec?.steps),
      workingPrinciple: cleanDisplayText(sec?.workingPrinciple),
      typesOrClassifications: toCleanArray(sec?.typesOrClassifications),
      advantages: [],
      disadvantages: [],
      comparisons: toCleanArray(sec?.comparisons),
      formulas: toCleanArray(sec?.formulas),
      examples: toCleanArray(sec?.examples),
      importantFacts: [],
      codeSnippet: cleanCodeText(sec?.codeSnippet),
      tableMarkdown: '',
      aiSupplementaryNote: cleanDisplayText(sec?.aiSupplementaryNote),
    }));

    const validDocObjectId = mongoose.Types.ObjectId.isValid(String(documentId))
      ? new mongoose.Types.ObjectId(String(documentId).trim())
      : new mongoose.Types.ObjectId();

    const notePayload = {
      userId: uid,
      documentId: validDocObjectId,
      documentTitle: cleanDisplayText(resolved.resolvedTitle),
      fileFormat: cleanDisplayText(resolved.fileFormat),
      subject: cleanDisplayText(parsed.subject || overview.subject || ''),
      title:
        cleanDisplayText(parsed.title) ||
        `${cleanDisplayText(resolved.resolvedTitle)} Study Notes`,
      topicScope: safeScope,
      topic: safeScope === 'topic' ? cleanTopic : '',
      noteType: safeNoteType,
      explanationLevel: safeLevel,
      difficulty: safeLevel,
      language: safeLanguage,
      generationStatus: 'completed',
      overview,
      sections,
      definitions: [],
      keyConcepts: [],
      formulas: [],
      examples: [],
      importantPoints: toCleanArray(parsed.importantPoints),
      sourceLimitations: [],
      version: 1,
      versions: [],
    };

    notePayload.contentText = buildFormattedNoteText(notePayload);

    const savedNote = await StudyNote.create(notePayload);

    return res.status(201).json({
      success: true,
      note: savedNote,
    });
  } catch (err) {
    const status = err?.statusCode || 500;
    console.error('Generate study note error:', err);
    return res.status(status).json({
      success: false,
      message: err?.message || 'Failed to generate study notes.',
    });
  }
};

export const getUserStudyNotesController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    const targetUserId = String(req.params.userId || '').trim();

    if (!uid || uid !== targetUserId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to saved study notes.',
      });
    }

    const notes = await StudyNote.find({ userId: targetUserId })
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();

    return res.json({ success: true, notes });
  } catch (err) {
    console.error('Get user study notes error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load saved study notes.',
    });
  }
};

export const updateStudyNoteController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to update notes.',
      });
    }

    const { noteId } = req.params;
    const {
      title,
      contentText,
      sections,
      noteType,
      explanationLevel,
      difficulty,
      language,
    } = req.body || {};

    const note = await StudyNote.findOne({ _id: noteId, userId: uid });
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Study note not found for this user.',
      });
    }

    note.versions = Array.isArray(note.versions) ? note.versions : [];
    note.versions.push({
      version: note.version || 1,
      title: note.title,
      contentText: note.contentText || '',
      sections: note.sections || [],
      noteType: note.noteType,
      explanationLevel:
        note.explanationLevel || note.difficulty || 'Intermediate',
      language: note.language,
      savedAt: new Date(),
    });
    note.version = (note.version || 1) + 1;

    if (typeof title === 'string' && title.trim()) {
      note.title = cleanDisplayText(title);
    }
    if (Array.isArray(sections)) {
      note.sections = sections;
      note.contentText = buildFormattedNoteText(note);
    }
    if (typeof contentText === 'string' && contentText.trim()) {
      note.contentText = cleanDisplayText(contentText);
    }
    if (noteType && VALID_NOTE_TYPES.has(noteType)) note.noteType = noteType;

    const nextLevel = String(explanationLevel || difficulty || '').trim();
    if (nextLevel && VALID_LEVELS.has(nextLevel)) {
      note.explanationLevel = nextLevel;
      note.difficulty = nextLevel;
    }
    if (language && VALID_LANGUAGES.has(language)) note.language = language;

    await note.save();
    return res.json({ success: true, note });
  } catch (err) {
    console.error('Update study note error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update study note.',
    });
  }
};

export const regenerateStudyNoteController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to regenerate notes.',
      });
    }

    const { noteId } = req.params;
    const existing = await StudyNote.findOne({ _id: noteId, userId: uid });
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Study note not found for this user.',
      });
    }

    const previousVersions = Array.isArray(existing.versions)
      ? existing.versions
      : [];
    const nextVersionNumber = (existing.version || 1) + 1;

    previousVersions.push({
      version: existing.version || 1,
      title: existing.title,
      contentText: existing.contentText || '',
      sections: existing.sections || [],
      noteType: existing.noteType,
      explanationLevel:
        existing.explanationLevel || existing.difficulty || 'Intermediate',
      language: existing.language,
      savedAt: new Date(),
    });

    const resolved = await resolveDocumentAndSource({
      uid,
      documentId: String(existing.documentId || ''),
      documentTitle: existing.documentTitle,
      documentContent: req.body?.documentContent || '',
    });

    if (!resolved.content || resolved.content.length < 80) {
      return res.status(400).json({
        success: false,
        message:
          'Source document content is unavailable for regeneration. Your existing edited note was preserved.',
      });
    }

    const prompt = `
Regenerate a complete, thorough study note for "${resolved.resolvedTitle}".
Cover every topic, subtopic, definition, key point, formula/complexity, example, and end-of-document question and answer in logical order.
Keep code snippets clean and valid with proper syntax.
Note Type: ${req.body?.noteType || existing.noteType} | Explanation Level: ${
      req.body?.explanationLevel ||
      existing.explanationLevel ||
      existing.difficulty ||
      'Intermediate'
    } | Language: ${req.body?.language || existing.language || 'English'}.

Source Content:
"""
${resolved.content.slice(0, 90000)}
"""

Return ONLY valid JSON with "title", "subject", "sections", and "importantPoints".
`;

    const rawText = await callGeminiText(prompt);
    const parsed =
      extractJsonObject(rawText) ||
      buildFallbackParsedFromText(
        rawText,
        `${resolved.resolvedTitle} Study Notes`
      );

    if (
      !parsed ||
      !Array.isArray(parsed.sections) ||
      parsed.sections.length === 0
    ) {
      return res.status(502).json({
        success: false,
        message:
          'Failed to regenerate notes cleanly. Your previous edited version remains untouched.',
      });
    }

    existing.title =
      cleanDisplayText(parsed.title) ||
      `${cleanDisplayText(resolved.resolvedTitle)} Study Notes`;
    existing.subject = cleanDisplayText(parsed.subject || existing.subject || '');
    existing.sections = parsed.sections.map((sec, idx) => ({
      topicNumber: Number(sec?.topicNumber) || idx + 1,
      heading: cleanDisplayText(sec?.heading || `Topic ${idx + 1}`),
      pageOrSlideRef: '',
      sourceBasis: 'source_grounded',
      subheadings: [],
      definition: cleanDisplayText(sec?.definition),
      explanation: cleanDisplayText(sec?.explanation),
      keyConcepts: [],
      characteristics: [],
      bulletPoints: toCleanArray(sec?.bulletPoints),
      steps: toCleanArray(sec?.steps),
      workingPrinciple: cleanDisplayText(sec?.workingPrinciple),
      typesOrClassifications: toCleanArray(sec?.typesOrClassifications),
      advantages: [],
      disadvantages: [],
      comparisons: toCleanArray(sec?.comparisons),
      formulas: toCleanArray(sec?.formulas),
      examples: toCleanArray(sec?.examples),
      importantFacts: [],
      codeSnippet: cleanCodeText(sec?.codeSnippet),
      tableMarkdown: '',
      aiSupplementaryNote: cleanDisplayText(sec?.aiSupplementaryNote),
    }));
    existing.importantPoints = toCleanArray(parsed.importantPoints);
    existing.version = nextVersionNumber;
    existing.versions = previousVersions;
    existing.contentText = buildFormattedNoteText(existing);

    await existing.save();
    return res.json({ success: true, note: existing });
  } catch (err) {
    console.error('Regenerate study note error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to regenerate study note.',
    });
  }
};

export const deleteStudyNoteController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to delete notes.',
      });
    }

    const { noteId } = req.params;
    const deleted = await StudyNote.findOneAndDelete({
      _id: noteId,
      userId: uid,
    });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Study note not found for this user.',
      });
    }

    return res.json({
      success: true,
      message: 'Study note deleted successfully.',
    });
  } catch (err) {
    console.error('Delete study note error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete study note.',
    });
  }
};

function sanitizeBaseFilename(name = 'lecture-notes') {
  return (
    String(name || 'lecture-notes')
      .replace(/\.(pdf|pptx?|docx?|csv|xlsx?|txt)$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'lecture-notes'
  );
}

async function renderPdfBuffer(title, textBody) {
  try {
    const mod = await import('pdfkit');
    const PDFDocument = mod?.default || mod;
    return await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(cleanDisplayText(title), { underline: true });
      doc.moveDown();
      doc.fontSize(13).text(cleanDisplayText(textBody), { lineGap: 5 });
      doc.end();
    });
  } catch {
    const safeLines = cleanDisplayText(textBody)
      .replace(/[^\x20-\x7E\n]/g, ' ')
      .split('\n')
      .slice(0, 45)
      .map(
        (line, idx) =>
          `BT /F1 12 Tf 50 ${740 - idx * 16} Td (${line.replace(
            /[()\\]/g,
            ''
          )}) Tj ET`
      )
      .join('\n');

    const pdfRaw = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${safeLines.length} >> stream
${safeLines}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 0000 n 
0000000058 0000 n 
0000000115 0000 n 
0000000241 0000 n 
0000000336 0000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
406
%%EOF`;
    return Buffer.from(pdfRaw, 'utf8');
  }
}

async function renderDocxBuffer(title, textBody) {
  try {
    const mod = await import('docx');
    const { Document: DocxDoc, Packer, Paragraph, TextRun } = mod;
    const paragraphs = [
      new Paragraph({
        children: [
          new TextRun({ text: cleanDisplayText(title), bold: true, size: 36 }),
        ],
      }),
      ...cleanDisplayText(textBody)
        .split('\n')
        .map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: line, size: 26 })],
            })
        ),
    ];
    const docxFile = new DocxDoc({ sections: [{ children: paragraphs }] });
    return await Packer.toBuffer(docxFile);
  } catch {
    return Buffer.from(
      `${cleanDisplayText(title)}\n\n${cleanDisplayText(textBody)}`,
      'utf8'
    );
  }
}

export const exportStudyNoteController = async (req, res) => {
  try {
    const uid = getRequesterUserId(req);
    if (!uid) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required to export notes.',
      });
    }

    const { noteId = '', format = 'pdf', topicIndices = null } = req.body || {};
    const note = await StudyNote.findOne({ _id: noteId, userId: uid }).lean();
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Study note not found for this user.',
      });
    }

    const allSections = Array.isArray(note.sections) ? note.sections : [];
    const chosenSections = Array.isArray(topicIndices)
      ? allSections.filter((_, idx) => topicIndices.includes(idx))
      : allSections;

    const exportObj = {
      ...note,
      sections: chosenSections.length > 0 ? chosenSections : allSections,
      importantPoints: Array.isArray(topicIndices) ? [] : note.importantPoints,
    };

    const formattedText = buildFormattedNoteText(exportObj);
    const baseName = sanitizeBaseFilename(note.title || note.documentTitle);
    const normalizedFormat = String(format || 'pdf').toLowerCase();

    if (normalizedFormat === 'docx') {
      const buffer = await renderDocxBuffer(note.title, formattedText);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${baseName}.docx"`
      );
      return res.send(buffer);
    }

    if (normalizedFormat === 'md' || normalizedFormat === 'txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${baseName}.${normalizedFormat}"`
      );
      return res.send(formattedText);
    }

    const pdfBuffer = await renderPdfBuffer(note.title, formattedText);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${baseName}.pdf"`
    );
    return res.send(pdfBuffer);
  } catch (err) {
    console.error('Export study note error:', err);
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to export study note.',
    });
  }
};