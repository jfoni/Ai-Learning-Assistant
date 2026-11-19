import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useTheme } from '../../context/ThemeContext';
import AppSidebar from '../../components/AppSidebar';
import {
  fetchDocuments,
  uploadDocument,
  analyzeDocument,
  deleteDocument,
} from '../../services/documentService';
import {
  FileText,
  Sparkles,
  Trash2,
  UploadCloud,
  ArrowUpRight,
  X,
  Menu,
  ArrowLeft,
} from 'lucide-react';

// Reject generic/empty filler lines that add no real study value
const isLowValueFiller = (line) => {
  const lower = String(line || '').toLowerCase().trim();
  if (!lower || lower.length < 12) return true;
  return /recognized as a scanned|image-based academic file|generalized structured framework|conceptual scaffolding|foundational terminology typically expected|theoretical progression building directly|core analytical methodologies and their practical applications within the specific academic discipline/i.test(
    lower
  );
};

// Build a quick summary whose length scales naturally with document size
const buildScaledQuickSummary = (rawText, docTitle, docSizeHint = 0) => {
  const isLargeDoc = Number(docSizeHint) > 15000;
  const maxBullets = isLargeDoc ? 9 : 5;

  const lines = String(rawText || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const bulletLines = lines
    .filter((line) => /^[-*•]\s+/.test(line))
    .map((line) => line.replace(/^[-*•]\s+/, '').trim())
    .filter((item) => item && !isLowValueFiller(item));

  if (bulletLines.length >= 2) {
    return bulletLines
      .slice(0, maxBullets)
      .map((item) => `- ${item}`)
      .join('\n');
  }

  const cleanLines = lines
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .filter((line) => line && !isLowValueFiller(line));

  if (cleanLines.length >= 2) {
    return cleanLines
      .slice(0, maxBullets)
      .map((item) => (item.startsWith('-') ? item : `- ${item}`))
      .join('\n');
  }

  return `- Extract key definitions, core mechanisms, and exam rules directly from ${
    docTitle || 'this document'
  }.`;
};

const renderSummaryInline = (text, isDark = false) => {
  if (!text) return null;
  const sanitized = String(text).replace(/\$([^$]+)\$/g, '$1').trim();
  const tokens = sanitized.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong
          key={idx}
          className={`font-extrabold px-2 py-0.5 rounded-md ${
            isDark
              ? 'text-[#E8ECEF] bg-[#2B3744]'
              : 'text-[#1f3b4d] bg-[#e2eaeb]'
          }`}
        >
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em
          key={idx}
          className={`italic ${
            isDark ? 'text-[#E5B880] font-extrabold' : 'text-[#6b4c35] font-bold'
          }`}
        >
          {token.slice(1, -1)}
        </em>
      );
    }

    if (/\b(important|key|remember|exam|optimal|heuristic|a\*|greedy)\b/i.test(token)) {
      return (
        <span
          key={idx}
          className={`font-extrabold ${
            isDark ? 'text-[#7EC4CF]' : 'text-[#2b6777]'
          }`}
        >
          {token}
        </span>
      );
    }

    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
};

const SummaryListView = ({ rawText, isDark = false }) => {
  if (!rawText) return null;

  const lines = String(rawText)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const sectionTitles = [
    'overview',
    'key concepts',
    'important definitions',
    'exam takeaways',
    'summary',
    'main points',
    'real-life example',
  ];

  const blocks = [];
  let bulletItems = [];

  const flushBulletList = (keyPrefix) => {
    if (bulletItems.length > 0) {
      blocks.push(
        <ul
          key={`${keyPrefix}-summary-ul`}
          className={`my-3.5 space-y-2.5 rounded-2xl border border-l-4 p-4 sm:p-5 list-none m-0 ${
            isDark
              ? 'bg-[#181D23] border-[#303A46] border-l-[#7EC4CF]'
              : 'bg-white border-[#54626f]/20 border-l-[#2b6777]'
          }`}
        >
          {bulletItems.map((item, idx) => {
            const isImportant = /\b(important|key|remember|exam|optimal)\b/i.test(item);
            return (
              <li
                key={idx}
                className={`flex items-start gap-2.5 leading-relaxed rounded-xl px-3 py-2 ${
                  isDark
                    ? isImportant
                      ? 'bg-[#22313A] text-[#E6F4F7] font-black'
                      : 'text-[#E8ECEF] font-black'
                    : isImportant
                      ? 'bg-[#e6f2f4] text-[#1f3b4d] font-semibold'
                      : 'text-[#1F2118] font-semibold'
                }`}
                style={{ fontSize: '20px' }}
              >
                <span
                  className={`mt-2.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                    isImportant
                      ? isDark
                        ? 'bg-[#7EC4CF]'
                        : 'bg-[#2b6777]'
                      : isDark
                        ? 'bg-[#94A3B8]'
                        : 'bg-[#6b4c35]'
                  }`}
                />
                <span className="flex-1">{renderSummaryInline(item, isDark)}</span>
              </li>
            );
          })}
        </ul>
      );
      bulletItems = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const cleaned = rawLine
      .replace(/^\*\*|\*\*$/g, '')
      .replace(/^#+\s*/, '')
      .trim();
    if (!cleaned) return;

    const bulletMatch = cleaned.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      bulletItems.push(bulletMatch[1].trim());
      return;
    }

    flushBulletList(`before-${idx}`);

    const normalized = cleaned.replace(/:$/, '').toLowerCase();
    if (sectionTitles.includes(normalized)) {
      blocks.push(
        <h4
          key={`h-${idx}`}
          className={`font-black mt-4 mb-1.5 ${
            isDark ? 'text-[#E8ECEF]' : 'text-[#1f3b4d]'
          }`}
          style={{ fontSize: '22px' }}
        >
          {cleaned.replace(/:$/, '')}
        </h4>
      );
      return;
    }

    blocks.push(
      <p
        key={`p-${idx}`}
        className={`leading-relaxed my-2 ${
          isDark ? 'text-[#E8ECEF] font-black' : 'text-[#1F2118] font-semibold'
        }`}
        style={{ fontSize: '20px' }}
      >
        {renderSummaryInline(cleaned, isDark)}
      </p>
    );
  });

  flushBulletList('end');

  return <div className="space-y-1">{blocks}</div>;
};

export default function DocumentListPage() {
  const { isDark } = useTheme();
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [pastedContent, setPastedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user?.uid) {
        setUserId(user.uid);
        await loadDocs(user.uid);
      } else {
        setUserId(null);
        setDocuments([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loadDocs = async (uid) => {
    try {
      setLoading(true);
      const data = await fetchDocuments(uid);
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!userId || (!file && !pastedContent.trim())) return;

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('title', title.trim() || (file ? file.name : 'Pasted Notes'));

    if (file) {
      formData.append('file', file);
    } else if (pastedContent.trim()) {
      const blob = new Blob([pastedContent], { type: 'text/plain' });
      formData.append('file', blob, `${title.trim() || 'Notes'}.txt`);
    }

    try {
      setUploading(true);
      await uploadDocument(formData);
      setTitle('');
      setFile(null);
      setPastedContent('');
      await loadDocs(userId);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  // Quick Summary scales with PDF length and strictly avoids generic filler
  const handleAnalyze = async (doc) => {
    try {
      setAnalyzingId(doc._id);
      setAiSummary(null);

      const contentLength =
        String(doc.content || doc.text || '').length || Number(doc.fileSize || 0);
      const isLarge = contentLength > 15000;

      const quickPrompt = [
        `Generate a concise, high-yield Quick Summary of "${doc.title}" focused strictly on useful, exam-relevant, and actionable information.`,
        'Rules:',
        '- Include only core definitions, key concepts, important formulas/rules, comparisons, and main takeaways.',
        '- Skip filler text, repetitive examples, greetings, or low-value background fluff.',
        '- Never write generic statements about file type or lecture number.',
        isLarge
          ? '- Because this document is long, provide 7 to 9 clear bullet points (- ) covering all major sections.'
          : '- Provide 4 to 5 crisp bullet points (- ) covering the essential points.',
        '- Keep all numbers and technical notes clear, accurate, and easy to read.',
      ].join('\n');

      const rawSummary = await analyzeDocument(doc._id, quickPrompt);
      const formattedSummary = buildScaledQuickSummary(
        rawSummary,
        doc.title,
        contentLength
      );
      setAiSummary({ id: doc._id, title: doc.title, summary: formattedSummary });
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((doc) => doc._id !== id));
      if (aiSummary?.id === id) setAiSummary(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#12141A] text-white' : 'bg-[#e2eaeb] text-[#54626f]'
      }`}
      style={{ fontSize: '18px' }}
    >
      <AppSidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page header */}
          <div
            className={`border rounded-2xl p-6 shadow-sm flex items-start justify-between gap-4 ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C]'
                : 'bg-white/85 backdrop-blur-md border-[#54626f]/20'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer ${
                  isDark
                    ? 'bg-[#222732] text-[#E5E7EB] hover:bg-[#2C3240]'
                    : 'bg-[#e2eaeb] text-[#1F2937] hover:bg-[#54626f] hover:text-white'
                }`}
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1
                  className={`font-black tracking-tight ${
                    isDark ? 'text-[#F3F4F6]' : 'text-[#1F2118]'
                  }`}
                  style={{ fontSize: '34px', lineHeight: 1.15 }}
                >
                  Documents &amp; AI Assistant
                </h1>
                <p
                  className={`mt-1.5 ${
                    isDark ? 'text-[#D1D5DB] font-black' : 'text-[#54626f] font-bold'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  Upload your personal study PDFs or notes to generate clean summaries and chat with AI.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`outside-card-text inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black transition shrink-0 cursor-pointer ${
                isDark
                  ? 'bg-[#222732] text-[#FFFFFF] border border-[#2E3542] hover:bg-[#2C3240]'
                  : 'bg-[#e2eaeb] text-[#54626f] hover:bg-[#54626f] hover:text-white'
              }`}
              style={{
                fontSize: '18px',
                color: isDark ? '#FFFFFF' : undefined,
                fontWeight: isDark ? 900 : undefined,
              }}
            >
              <ArrowLeft
                className="w-4 h-4"
                style={{ color: isDark ? '#FFFFFF' : undefined }}
              />
              <span style={{ color: isDark ? '#FFFFFF' : undefined }}>Back</span>
            </button>
          </div>

          {/* Upload form card */}
          <div
            className={`border rounded-2xl p-6 shadow-sm ${
              isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white/90 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-center gap-2 mb-4">
              <UploadCloud className="w-6 h-6 text-[#54626f]" />
              <h2
                className={`${
                  isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                }`}
                style={{ fontSize: '23px' }}
              >
                Add New Study Material
              </h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-bold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    Document Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter custom title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#54626f] ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] placeholder-[#9CA3AF] font-bold'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                    }`}
                    style={{ fontSize: '18px' }}
                  />
                </div>

                <div>
                  <label
                    className={`block uppercase tracking-wider mb-1.5 ${
                      isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-bold'
                    }`}
                    style={{ fontSize: '15px' }}
                  >
                    Select PDF / Text File
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className={`w-full px-3 py-2.5 rounded-xl border file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-[#54626f] file:text-white hover:file:bg-[#1F2118] cursor-pointer ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] text-[#E5E7EB] font-bold'
                        : 'bg-[#f8fafb] border-[#54626f]/25 text-[#54626f]'
                    }`}
                    style={{ fontSize: '17px' }}
                  />
                </div>
              </div>

              <div>
                <label
                  className={`block uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-[#E5E7EB] font-black' : 'text-[#54626f] font-bold'
                  }`}
                  style={{ fontSize: '15px' }}
                >
                  Or Paste Lecture Notes Directly
                </label>
                <textarea
                  rows="3"
                  placeholder="Paste topic notes or text here..."
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#54626f] ${
                    isDark
                      ? 'bg-[#12141A] border-[#2E3542] text-[#F3F4F6] placeholder-[#9CA3AF] font-bold'
                      : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118]'
                  }`}
                  style={{ fontSize: '18px' }}
                />
              </div>

              <button
                type="submit"
                disabled={uploading || (!file && !pastedContent.trim())}
                className={`px-6 py-3 rounded-xl text-white bg-[#54626f] hover:bg-[#1F2118] transition shadow-sm disabled:opacity-50 cursor-pointer ${
                  isDark ? 'font-black' : 'font-bold'
                }`}
                style={{ fontSize: '18px' }}
              >
                {uploading ? 'Uploading & Saving...' : 'Save Material'}
              </button>
            </form>
          </div>

          {/* Summary preview banner */}
          {aiSummary && (
            <div
              className={`border rounded-2xl p-6 shadow-md ${
                isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white/95 border-[#54626f]/25'
              }`}
            >
              <div className="flex items-center justify-between border-b border-[#54626f]/15 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#7EC4CF]" />
                  <h3
                    className={`${
                      isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                    }`}
                    style={{ fontSize: '22px' }}
                  >
                    Quick Summary — {aiSummary.title}
                  </h3>
                </div>
                <button
                  onClick={() => setAiSummary(null)}
                  className="p-1.5 rounded-lg text-[#9CA3AF] hover:bg-[#222732] transition cursor-pointer"
                  aria-label="Close summary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div
                className={`p-4 rounded-xl border ${
                  isDark
                    ? 'bg-[#12141A] border-[#2E3542]'
                    : 'bg-[#e2eaeb]/45 border-[#54626f]/10'
                }`}
              >
                <SummaryListView rawText={aiSummary.summary} isDark={isDark} />
              </div>
            </div>
          )}

          {/* Saved documents list */}
          <div
            className={`border rounded-2xl p-6 shadow-sm ${
              isDark ? 'bg-[#171A21] border-[#2C313C]' : 'bg-white/90 border-[#54626f]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`${
                  isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                }`}
                style={{ fontSize: '23px' }}
              >
                Your Saved Documents
              </h2>
              <span
                className={`px-3.5 py-1 rounded-full ${
                  isDark
                    ? 'bg-[#222732] text-[#F3F4F6] font-black'
                    : 'bg-[#e2eaeb] text-[#54626f] font-bold'
                }`}
                style={{ fontSize: '17px' }}
              >
                {Number(documents.length)} Files
              </span>
            </div>

            {loading ? (
              <p
                className={`py-6 ${
                  isDark ? 'text-[#D1D5DB] font-black' : 'text-[#54626f] font-bold'
                }`}
                style={{ fontSize: '19px' }}
              >
                Loading your documents...
              </p>
            ) : documents.length === 0 ? (
              <div
                className={`text-center py-10 px-4 rounded-xl border border-dashed ${
                  isDark
                    ? 'bg-[#12141A] border-[#2E3542]'
                    : 'bg-[#e2eaeb]/40 border-[#54626f]/25'
                }`}
              >
                <FileText className="w-9 h-9 text-[#54626f]/60 mx-auto mb-2" />
                <p
                  className={`${
                    isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                  }`}
                  style={{ fontSize: '20px' }}
                >
                  No documents found for your account
                </p>
                <p
                  className={`mt-1 ${
                    isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f] font-semibold'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  Upload a PDF or paste notes above to start studying.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                      isDark
                        ? 'bg-[#12141A] border-[#2E3542] hover:bg-[#1A1E26]'
                        : 'bg-[#f8fafb] border-[#54626f]/15 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#222732] text-[#E8ECEF] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3
                          className={`truncate ${
                            isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
                          }`}
                          style={{ fontSize: '20px' }}
                        >
                          {doc.title}
                        </h3>
                        <p
                          className={`mt-0.5 ${
                            isDark ? 'text-[#D1D5DB] font-bold' : 'text-[#54626f] font-bold'
                          }`}
                          style={{ fontSize: '17px' }}
                        >
                          Added on:{' '}
                          {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        to={`/documents/${doc._id}`}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white bg-[#54626f] hover:bg-[#1F2118] transition ${
                          isDark ? 'font-black' : 'font-bold'
                        }`}
                        style={{ fontSize: '17px' }}
                      >
                        <span>Open &amp; Chat</span>
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>

                      <button
                        onClick={() => handleAnalyze(doc)}
                        disabled={analyzingId === doc._id}
                        className={`px-3.5 py-2 rounded-lg transition disabled:opacity-50 cursor-pointer ${
                          isDark
                            ? 'bg-[#222732] text-[#F3F4F6] hover:bg-[#2C3240] font-black'
                            : 'bg-[#e2eaeb] text-[#54626f] hover:bg-[#d2dee0] font-bold'
                        }`}
                        style={{ fontSize: '17px' }}
                      >
                        {analyzingId === doc._id ? 'Summarizing...' : 'Quick Summary'}
                      </button>

                      <button
                        onClick={() => handleDelete(doc._id)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-red-500 bg-red-500/10 hover:bg-red-500/20 transition cursor-pointer ${
                          isDark ? 'font-black' : 'font-bold'
                        }`}
                        style={{ fontSize: '17px' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}