import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { uploadDocument, getDocuments, deleteDocument } from '../controllers/documentController.js';

const router = express.Router();

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

// Order matters: /upload must be BEFORE /:userId
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/:userId', getDocuments);
router.get('/', getDocuments);
router.delete('/:id', deleteDocument);

export default router;