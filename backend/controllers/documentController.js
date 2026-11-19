import Document from '../models/Document.js';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

// Helper function to extract text from uploaded file safely
const extractTextFromFile = async (document) => {
  let extractedText = '';

  if (document.filePath || document.fileName) {
    try {
      const possiblePaths = [
        document.filePath,
        `uploads/${document.fileName}`,
        `backend/uploads/${document.fileName}`,
        `./uploads/${document.fileName}`,
        `../uploads/${document.fileName}`,
      ];

      let targetPath = null;
      for (const p of possiblePaths) {
        if (p && fs.existsSync(p)) {
          targetPath = p;
          break;
        }
      }

      if (targetPath) {
        if (targetPath.toLowerCase().endsWith('.txt')) {
          extractedText = fs.readFileSync(targetPath, 'utf-8');
        } else {
          const dataBuffer = fs.readFileSync(targetPath);
          const parseFunction =
            typeof pdfParse === 'function' ? pdfParse : pdfParse.default || pdfParse;

          if (typeof parseFunction === 'function') {
            const pdfData = await parseFunction(dataBuffer);
            if (pdfData && pdfData.text && pdfData.text.trim().length > 5) {
              extractedText = pdfData.text;
            }
          }
        }
      }
    } catch (err) {
      console.error('File parsing error bypassed:', err.message);
    }
  }

  if (!extractedText || extractedText.trim().length < 5) {
    extractedText = `Document Title: ${document.title}. Note: Scanned or image-based PDF detected. Provide a structured academic study summary, core concepts, key definitions, and study takeaways based on the document title.`;
  }

  return extractedText;
};

// Upload Document for a specific user
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a file' });
    }

    const userId = req.body.userId || req.user?.uid || req.user?.id;
    const { title } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const newDocument = new Document({
      userId: String(userId),
      title: title || req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: Number(req.file.size) || 0,
      status: 'ready',
    });

    const savedDocument = await newDocument.save();

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: savedDocument,
    });
  } catch (error) {
    next(error);
  }
};

// Get Documents strictly for a specific user
export const getDocuments = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.query.userId || req.user?.uid || req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required to fetch documents',
      });
    }

    const documents = await Document.find({ userId: String(userId) }).sort({
      uploadDate: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: Number(documents.length),
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

// Analyze Document with Gemini AI and return clean structured summary
export const analyzeDocumentAI = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const extractedText = await extractTextFromFile(document);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Gemini API Key not configured' });
    }

    const prompt = `
You are an expert academic study assistant. Analyze the following study material and generate a clean, well-organized, easy-to-read study summary.

Use these exact section headers separated by blank lines:
Overview
Key Concepts
Important Definitions
Exam Takeaways

Rules:
- Keep paragraphs short (2 to 3 lines max).
- Use "- " at the start of bullet points for lists.
- Do not wrap the entire output in code blocks.

Document Title: ${document.title}
Content:
${extractedText.substring(0, 20000)}
    `.trim();

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
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

    const summary =
      apiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary could be generated.';

    return res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error('AI Analysis Controller Error:', error);
    next(error);
  }
};

// Delete Document
export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await Document.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// AI Chat & Explain Concept Controller
export const chatWithDocumentAI = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question, mode } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, error: 'Question is required' });
    }

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const extractedText = await extractTextFromFile(document);

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Gemini API Key not configured' });
    }

    const prompt =
      mode === 'explain'
        ? `You are an expert tutor. Based on the document context below, explain the concept clearly with simple definitions, examples, and bullet points.\n\nDocument Context:\n${extractedText.substring(0, 15000)}\n\nConcept to Explain: ${question}`
        : `You are a helpful AI study assistant. Answer the user's question clearly based on the provided document context.\n\nDocument Context:\n${extractedText.substring(0, 15000)}\n\nQuestion: ${question}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const apiData = await apiResponse.json();

    if (apiData.error) {
      return res.status(500).json({
        success: false,
        error: apiData.error.message || 'Gemini API error',
      });
    }

    const answer =
      apiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    return res.status(200).json({
      success: true,
      data: { answer },
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    next(error);
  }
};