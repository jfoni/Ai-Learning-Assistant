import express from 'express';
import multer from 'multer';
import fs from 'fs';
import Document from '../models/Document.js';

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 1. Upload Document API (POST /api/documents/upload)
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Please upload a file' });
    }

    const { userId, title } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const newDocument = new Document({
      userId,
      title: title || req.file.originalname,
      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      status: 'ready'
    });

    const savedDocument = await newDocument.save();

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: savedDocument
    });
  } catch (error) {
    next(error);
  }
});

// 2. Get Documents by User ID API (GET /api/documents/:userId)
router.get('/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const documents = await Document.find({ userId }).sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    next(error);
  }
});

// 3. Delete Document API (DELETE /api/documents/:id)
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Remove physical file from uploads folder if it exists
    if (document.filePath && fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    await Document.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;