import Document from '../models/Document.js';
import fs from 'fs';

// Upload Document
export const uploadDocument = async (req, res, next) => {
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
};

// Get Documents by User ID
export const getDocuments = async (req, res, next) => {
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

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};