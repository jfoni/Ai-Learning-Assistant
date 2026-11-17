import Document from '../models/Document.js';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

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
    const query = userId ? { userId } : {};
    const documents = await Document.find(query).sort({ uploadDate: -1 });

    res.status(200).json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    next(error);
  }
};

// Analyze Document with Gemini AI
export const analyzeDocumentAI = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Document.findById(id);

    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    let extractedText = "";

    if (document.filePath || document.fileName) {
      try {
        let possiblePaths = [
          document.filePath,
          `uploads/${document.fileName}`,
          `backend/uploads/${document.fileName}`,
          `./uploads/${document.fileName}`,
          `../uploads/${document.fileName}`
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
            // Parse PDF file safely
            const dataBuffer = fs.readFileSync(targetPath);
            const parseFunction = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
            
            if (typeof parseFunction === 'function') {
              const pdfData = await parseFunction(dataBuffer);
              if (pdfData && pdfData.text && pdfData.text.trim().length > 5) {
                extractedText = pdfData.text;
              }
            }
          }
        }
      } catch (pdfErr) {
        console.error('PDF parsing error bypassed:', pdfErr.message);
      }
    }

    // Smart Fallback: If PDF text extraction failed (scanned/image PDF), use title & filename context 
    // so Gemini can generate a structured study guide based on the subject name.
    if (!extractedText || extractedText.trim().length < 5) {
      extractedText = `Document Title: ${document.title}. Note: This PDF file format is image-based or restricted, so please generate a comprehensive, high-quality standard academic study guide, core concepts, and exam preparation notes specifically tailored for this subject name and title.`;
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Gemini API Key not configured' });
    }

    const prompt = `You are an expert AI Study Assistant. Thoroughly analyze the following document content or title context and provide a comprehensive, structured study summary, key concepts, definitions, and key takeaways in clean text format.

    Document Title: ${document.title}
    Content / Context: ${extractedText.substring(0, 20000)}`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const apiData = await apiResponse.json();
    
    if (apiData.error) {
      console.error('Gemini API Error:', apiData.error);
      return res.status(500).json({ success: { success: false, error: apiData.error.message || 'Gemini API error' } });
    }

    const summary = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary could be generated.';

    res.status(200).json({
      success: true,
      data: { summary }
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

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
// AI Chat & Explain Concept Controller
export const chatWithDocumentAI = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { question, mode } = req.body; // mode: 'chat' or 'explain'
    
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    // Extract text or use title context similar to summary
    let extractedText = `Document Title: ${document.title}`;
    if (document.filePath) {
      try {
        const targetPath = document.filePath;
        if (fs.existsSync(targetPath)) {
          const dataBuffer = fs.readFileSync(targetPath);
          const parseFunction = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
          const pdfData = await parseFunction(dataBuffer);
          if (pdfData && pdfData.text) extractedText = pdfData.text;
        }
      } catch (err) {
        console.error('PDF Read error:', err.message);
      }
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ success: false, error: 'Gemini API Key not configured' });
    }

    let prompt = "";
    if (mode === 'explain') {
      prompt = `You are an expert tutor. Based on the following document context, explain the concept or answer the user's request clearly with simple definitions, examples, and key takeaways.
      
      Document Content/Context: ${extractedText.substring(0, 15000)}
      
      User Request / Concept to Explain: ${question}`;
    } else {
      prompt = `You are a helpful AI study assistant. Answer the user's question accurately based *only* or primarily on the provided document context. If the answer is outside the document, use your general knowledge but relate it to the document's theme.
      
      Document Context: ${extractedText.substring(0, 15000)}
      
      User Question: ${question}`;
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const apiData = await apiResponse.json();
    const answer = apiData?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

    res.status(200).json({ success: true, data: { answer } });
  } catch (error) {
    console.error('AI Chat Error:', error);
    next(error);
  }
};