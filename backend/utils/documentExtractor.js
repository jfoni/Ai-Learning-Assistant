import fs from 'fs/promises';
import path from 'path';
import { extractTextFromPdfWithFallback } from './pdfParser.js';

const SUPPORTED_EXTENSIONS = new Set([
  '.pdf',
  '.ppt',
  '.pptx',
  '.doc',
  '.docx',
  '.csv',
  '.xls',
  '.xlsx',
  '.txt',
]);

export function getFileFormat(fileName = '', mimeType = '') {
  const ext = path.extname(String(fileName || '')).toLowerCase();
  if (SUPPORTED_EXTENSIONS.has(ext)) return ext.replace('.', '');

  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'pptx';
  if (mime.includes('wordprocessing') || mime.includes('msword')) return 'docx';
  if (mime.includes('spreadsheet') || mime.includes('excel')) return 'xlsx';
  if (mime.includes('csv')) return 'csv';
  if (mime.includes('text/plain')) return 'txt';
  return ext.replace('.', '') || 'unknown';
}

function decodeXmlEntities(str = '') {
  return String(str)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

async function extractPptxText(filePath) {
  try {
    const mod = await import('jszip');
    const JSZip = mod?.default || mod;
    const buf = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(buf);

    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const na = Number((a.match(/slide(\d+)\.xml/i) || [])[1] || 0);
        const nb = Number((b.match(/slide(\d+)\.xml/i) || [])[1] || 0);
        return na - nb;
      });

    const slides = [];
    for (let i = 0; i < slideFiles.length; i += 1) {
      const xml = await zip.files[slideFiles[i]].async('string');
      // Extract table rows and text runs cleanly
      const paragraphs = xml.split(/<\/a:p>/gi).map((p) => {
        const runs = [...p.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi)].map(
          (m) => decodeXmlEntities(m[1])
        );
        return runs.join('').trim();
      });
      const cleanSlide = paragraphs.filter(Boolean).join('\n');
      slides.push(`[Slide ${i + 1}]\n${cleanSlide || '(Empty slide)'}`);
    }

    return {
      text: slides.join('\n\n'),
      totalPagesOrSlides: slideFiles.length,
      warnings:
        slideFiles.length === 0
          ? ['No slides could be read from the PowerPoint file.']
          : [],
    };
  } catch (err) {
    return {
      text: '',
      totalPagesOrSlides: 0,
      warnings: [
        `PowerPoint extraction requires 'jszip' or a readable .pptx file (${err.message}).`,
      ],
    };
  }
}

async function extractDocxOrDocText(filePath, ext) {
  try {
    const mod = await import('mammoth');
    const mammoth = mod?.default || mod;
    const result = await mammoth.extractRawText({ path: filePath });
    const text = String(result?.value || '').trim();
    const warnings = (result?.messages || [])
      .map((m) => m?.message)
      .filter(Boolean);

    return {
      text,
      totalPagesOrSlides: null,
      warnings: text
        ? warnings
        : [...warnings, `No readable text extracted from ${ext} file.`],
    };
  } catch {
    if (ext === '.docx') {
      try {
        const mod = await import('jszip');
        const JSZip = mod?.default || mod;
        const buf = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(buf);
        const docXml = zip.files['word/document.xml'];
        if (docXml) {
          const xml = await docXml.async('string');
          const paras = xml.split(/<\/w:p>/gi).map((p) =>
            [...p.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/gi)]
              .map((m) => decodeXmlEntities(m[1]))
              .join('')
              .trim()
          );
          const text = paras.filter(Boolean).join('\n');
          return { text, totalPagesOrSlides: null, warnings: [] };
        }
      } catch {
        // fall through
      }
    }

    const rawBuf = await fs.readFile(filePath);
    const printable = rawBuf
      .toString('utf8')
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{3,}/g, '\n')
      .trim();

    return {
      text: printable,
      totalPagesOrSlides: null,
      warnings: [
        `Install 'mammoth' for full ${ext} formatting, headings, and table extraction.`,
      ],
    };
  }
}

async function extractSpreadsheetText(filePath, ext) {
  const raw = await fs.readFile(filePath, 'utf8').catch(() => '');

  if (ext === '.csv' && raw) {
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const formattedRows = lines.map((line, idx) =>
      idx === 0 ? `Columns: ${line}` : `Row ${idx}: ${line}`
    );
    return {
      text: `[CSV Data]\n${formattedRows.join('\n')}`,
      totalPagesOrSlides: 1,
      warnings: [],
    };
  }

  try {
    const mod = await import('xlsx');
    const XLSX = mod?.default || mod;
    const workbook = XLSX.readFile(filePath);
    const sheetParts = [];

    for (const sheetName of workbook.SheetNames || []) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const nonEmpty = rows.filter((r) =>
        r.some((cell) => String(cell ?? '').trim() !== '')
      );
      const formatted = nonEmpty.map((r, idx) => {
        const rowStr = r.map((c) => String(c ?? '').trim()).join(' | ');
        return idx === 0 ? `Columns: ${rowStr}` : `Row ${idx}: ${rowStr}`;
      });
      sheetParts.push(`[Sheet: ${sheetName}]\n${formatted.join('\n')}`);
    }

    return {
      text: sheetParts.join('\n\n'),
      totalPagesOrSlides: (workbook.SheetNames || []).length || 1,
      warnings: [],
    };
  } catch (err) {
    return {
      text: raw.trim(),
      totalPagesOrSlides: 1,
      warnings: raw.trim()
        ? []
        : [`Spreadsheet parsing failed (${err.message}). Install 'xlsx'.`],
    };
  }
}

async function runOcrFallback(filePath) {
  try {
    const mod = await import('tesseract.js');
    const tesseract = mod?.default || mod;
    const { data } = await tesseract.recognize(filePath, 'eng');
    const ocrText = String(data?.text || '').trim();
    return {
      text: ocrText,
      usedOcr: Boolean(ocrText),
      warning: ocrText
        ? 'Scanned content recognized via OCR; verify technical formulas and symbols carefully.'
        : 'OCR could not extract readable text from scanned pages.',
    };
  } catch {
    return {
      text: '',
      usedOcr: false,
      warning:
        'Document appears scanned or image-based, and OCR (tesseract.js) is not available on the server.',
    };
  }
}

async function extractPdfContent(filePath) {
  let extracted = '';
  try {
    extracted = String((await extractTextFromPdfWithFallback(filePath)) || '').trim();
  } catch {
    extracted = '';
  }

  const pageMatches = extracted.match(/\[?page\s+\d+\]?/gi) || [];
  const totalPagesOrSlides = pageMatches.length > 0 ? pageMatches.length : null;
  const warnings = [];
  let usedOcr = false;

  // Trigger OCR fallback when PDF text is missing or very sparse (likely scanned)
  if (extracted.length < 80) {
    const ocrResult = await runOcrFallback(filePath);
    if (ocrResult.usedOcr) {
      extracted = `[OCR Extracted Text]\n${ocrResult.text}`;
      usedOcr = true;
    }
    if (ocrResult.warning) warnings.push(ocrResult.warning);
  }

  return {
    text: extracted,
    totalPagesOrSlides,
    usedOcr,
    warnings,
  };
}

export async function extractDocumentContent({
  filePath,
  fileName = '',
  mimeType = '',
  rawBuffer = null,
}) {
  const format = getFileFormat(fileName || filePath, mimeType);

  if (!SUPPORTED_EXTENSIONS.has(`.${format}`)) {
    return {
      fileFormat: format,
      extractedText: '',
      totalPagesOrSlides: null,
      extractionStatus: 'failed',
      usedOcr: false,
      warnings: [`Unsupported file format: .${format}`],
    };
  }

  let tempPath = filePath;
  let cleanupTemp = false;

  if (!tempPath && rawBuffer) {
    const os = await import('os');
    tempPath = path.join(
      os.tmpdir(),
      `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.${format}`
    );
    await fs.writeFile(tempPath, rawBuffer);
    cleanupTemp = true;
  }

  try {
    let result = { text: '', totalPagesOrSlides: null, warnings: [], usedOcr: false };

    if (format === 'pdf') {
      result = await extractPdfContent(tempPath);
    } else if (format === 'pptx' || format === 'ppt') {
      result = await extractPptxText(tempPath);
    } else if (format === 'docx' || format === 'doc') {
      result = await extractDocxOrDocText(tempPath, `.${format}`);
    } else if (format === 'csv' || format === 'xlsx' || format === 'xls') {
      result = await extractSpreadsheetText(tempPath, `.${format}`);
    } else if (format === 'txt') {
      const txt = await fs.readFile(tempPath, 'utf8');
      result = { text: txt.trim(), totalPagesOrSlides: null, warnings: [], usedOcr: false };
    }

    const cleanText = String(result.text || '').trim();
    let extractionStatus = 'ready';
    if (!cleanText) {
      extractionStatus = 'failed';
    } else if (result.warnings?.length > 0 || cleanText.length < 120) {
      extractionStatus = 'partial';
    }

    return {
      fileFormat: format,
      extractedText: cleanText,
      totalPagesOrSlides: result.totalPagesOrSlides,
      extractionStatus,
      usedOcr: Boolean(result.usedOcr),
      warnings: result.warnings || [],
    };
  } finally {
    if (cleanupTemp && tempPath) {
      await fs.unlink(tempPath).catch(() => {});
    }
  }
}

export function chunkExtractedText(text = '', chunkSize = 12000, overlap = 800) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) {
    return [{ index: 0, total: 1, content: clean }];
  }

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    if (end < clean.length) {
      const lastBreak = clean.lastIndexOf('\n', end);
      if (lastBreak > start + chunkSize * 0.6) {
        end = lastBreak;
      }
    }
    chunks.push({
      index,
      content: clean.slice(start, end).trim(),
    });
    index += 1;
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.map((c) => ({ ...c, total: chunks.length }));
}