import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Document from '../models/Document.js';
import {
  uploadDocument,
  getDocuments,
  analyzeDocumentAI,
  deleteDocument,
  getChatHistory,
  clearChatHistory,
  chatWithDocumentAI,
} from '../controllers/documentController.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = String(file.originalname || 'document').replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const normalizeSingleUploadField = (req, res, next) => {
  const mw = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'document', maxCount: 1 },
  ]);

  mw(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed',
        message: err.message || 'File upload failed',
      });
    }
    const picked =
      req.files?.file?.[0] || req.files?.document?.[0] || req.file || null;
    if (picked) {
      req.file = picked;
    }
    next();
  });
};

// GET /api/documents?userId=...
router.get('/', getDocuments);

// GET /api/documents/:userId
router.get('/:userId', (req, res, next) => {
  if (!req.query.userId && req.params.userId) {
    req.query.userId = req.params.userId;
  }
  return getDocuments(req, res, next);
});

// POST /api/documents/upload
router.post('/upload', normalizeSingleUploadField, uploadDocument);

// POST /api/documents/:id/analyze
router.post('/:id/analyze', analyzeDocumentAI);

// GET /api/documents/:id/chat
router.get('/:id/chat', getChatHistory);

// POST /api/documents/:id/chat
router.post('/:id/chat', chatWithDocumentAI);

// DELETE /api/documents/:id/chat
router.delete('/:id/chat', clearChatHistory);

// DELETE /api/documents/:id
router.delete('/:id', deleteDocument);

// GET /api/documents/:id/extract — helper for Note Generator to get extracted text/topic context
router.get('/:id/extract', async (req, res) => {
  try {
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const cleanTopic = String(doc.title || 'Study Material')
      .replace(/\.(pdf|txt|docx?|pptx?)$/i, '')
      .replace(/\(\d+\)/g, '')
      .replace(/^\d+(\.\d+)*\s*/, '')
      .trim();

    let text = String(doc.content || doc.text || doc.extractedText || '').trim();

    if (!text && doc.filePath && fs.existsSync(doc.filePath)) {
      if (doc.filePath.toLowerCase().endsWith('.txt')) {
        text = fs.readFileSync(doc.filePath, 'utf-8').trim();
      } else {
        try {
          const { createRequire } = await import('module');
          const require = createRequire(import.meta.url);
          const pdfParse = require('pdf-parse');
          const parseFn =
            typeof pdfParse === 'function' ? pdfParse : pdfParse?.default;
          if (typeof parseFn === 'function') {
            const buf = fs.readFileSync(doc.filePath);
            const parsed = await parseFn(buf);
            if (parsed?.text && parsed.text.trim().length > 5) {
              text = parsed.text.trim();
            }
          }
        } catch {
          // fallback below
        }
      }
    }

    if (!text) {
      text = `Topic from uploaded file: ${cleanTopic || doc.title}. Extract only what is directly supported by the file title and note any missing source text.`;
    }

    return res.status(200).json({
      success: true,
      title: doc.title,
      content: text,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || 'Failed to read document content.',
    });
  }
});

// GET /api/documents/:id — single document details (kept after /:userId so userId lookup still works)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(String(req.params.id).trim())) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    const doc = await Document.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    return res.status(200).json({ success: true, data: doc });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;