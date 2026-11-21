import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const MULTIMODAL_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function extractWithPdfJs(filePath) {
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data, verbosity: 0 });
    const doc = await loadingTask.promise;

    const pages = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = (textContent.items || [])
        .map((item) => item?.str || '')
        .join(' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (pageText) {
        pages.push(`Page ${pageNum}:\n${pageText}`);
      }
    }
    return pages.join('\n\n').trim();
  } catch {
    return '';
  }
}

async function extractTextViaGeminiMultimodal(filePath) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey || !filePath || !fs.existsSync(filePath)) return '';

  const ext = path.extname(filePath).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');

  const parts = [];
  if (ext === '.pdf') {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: base64Data,
      },
    });
  } else {
    const readableSlice = fileBuffer
      .toString('utf8')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{3,}/g, ' ')
      .trim()
      .slice(0, 30000);

    parts.push({
      text: `File (${path.basename(filePath)}):\n${readableSlice}`,
    });
  }

  parts.push({
    text: 'Extract all readable headings, definitions, explanations, bullet points, formulas, tables, code, and exam questions from this file in reading order without adding commentary.',
  });

  const uniqueModels = [...new Set(MULTIMODAL_MODELS.filter(Boolean))];
  let lastError = null;

  for (const modelName of uniqueModels) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
          throw new Error(
            data?.error?.message ||
              `Gemini extraction failed (${response.status}) on ${modelName}`
          );
        }

        const out = String(
          data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        ).trim();
        if (out) return out;
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

  if (lastError) {
    throw lastError;
  }
  return '';
}

export async function extractTextFromPdfWithFallback(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.txt' || ext === '.md') {
    return fs.readFileSync(filePath, 'utf-8').trim();
  }

  let extractedText = '';

  if (ext === '.pdf') {
    try {
      const buffer = fs.readFileSync(filePath);
      const parseFn =
        typeof pdfParse === 'function' ? pdfParse : pdfParse?.default;
      if (typeof parseFn === 'function') {
        const parsed = await parseFn(buffer);
        if (parsed?.text && parsed.text.trim().length > 80) {
          extractedText = parsed.text.trim();
        }
      }
    } catch {
      // Try pdfjs next
    }

    if (!extractedText) {
      const pdfJsText = await extractWithPdfJs(filePath);
      if (pdfJsText && pdfJsText.length > 80) {
        extractedText = pdfJsText;
      }
    }
  }

  if (!extractedText) {
    try {
      extractedText = await extractTextViaGeminiMultimodal(filePath);
    } catch (err) {
      console.error('Multimodal file extraction error:', err?.message || err);
    }
  }

  return extractedText;
}