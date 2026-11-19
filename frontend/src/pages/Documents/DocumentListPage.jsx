import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
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
  BookOpen,
  BrainCircuit,
  TrendingUp,
  Target,
  LogOut,
} from 'lucide-react';

const SIDEBAR_SUBTITLE = 'Personal Study Space';

export default function DocumentListPage() {
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

  const handleLogout = async () => {
    setIsSidebarOpen(false);
    await signOut(auth);
    navigate('/login');
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

  const handleAnalyze = async (doc) => {
    try {
      setAnalyzingId(doc._id);
      setAiSummary(null);
      const summary = await analyzeDocument(doc._id);
      setAiSummary({ id: doc._id, title: doc.title, summary });
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
    <div className="min-h-screen bg-[#e2eaeb] text-[#54626f] flex relative">
      {isSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/25 z-30 transition-opacity"
          aria-hidden="true"
        />
      )}

      {isSidebarOpen && (
        <aside className="fixed md:static top-0 left-0 h-screen md:h-auto w-64 bg-white border-r border-[#D5DDE0] p-6 flex flex-col justify-between shadow-lg z-40 shrink-0">
          <div>
            <div className="flex items-center justify-between mb-10 px-1">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#54626f] text-white flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="font-black text-lg tracking-tight text-[#1F2118]">
                    AI Assistant
                  </h1>
                  <p className="text-[10px] font-black tracking-wider uppercase text-[#54626f]">
                    {SIDEBAR_SUBTITLE}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                aria-label="Close sidebar"
                className="p-2 rounded-xl text-[#54626f] hover:bg-[#e2eaeb] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <nav className="space-y-2">
              <Link
                to="/dashboard"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1F2937] hover:bg-[#E2EAEB] transition"
              >
                <TrendingUp className="w-4 h-4" />
                <span>Overview</span>
              </Link>
              <Link
                to="/documents"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold bg-[#54626f] text-white transition"
              >
                <FileText className="w-4 h-4" />
                <span>Documents</span>
              </Link>
              <Link
                to="/flashcards"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1F2937] hover:bg-[#E2EAEB] transition"
              >
                <BrainCircuit className="w-4 h-4" />
                <span>Flashcards</span>
              </Link>
              <Link
                to="/quizzes"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1F2937] hover:bg-[#E2EAEB] transition"
              >
                <BookOpen className="w-4 h-4" />
                <span>Quizzes</span>
              </Link>
              <Link
                to="/improvement"
                onClick={closeSidebar}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-extrabold text-[#1F2937] hover:bg-[#E2EAEB] transition"
              >
                <Target className="w-4 h-4" />
                <span>Improvement</span>
              </Link>
            </nav>
          </div>

          <div className="pt-6 border-t border-[#D5DDE0]">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2] rounded-2xl text-sm font-bold transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>
      )}

      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Page Header: 3-line on left, Back on right */}
          <div className="bg-white/85 backdrop-blur-md border border-[#54626f]/20 rounded-2xl p-6 shadow-sm flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <button
                type="button"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
                className="w-11 h-11 rounded-xl bg-[#e2eaeb] text-[#1F2937] hover:bg-[#54626f] hover:text-white flex items-center justify-center transition shrink-0 mt-0.5 cursor-pointer"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1F2118] tracking-tight">
                  Documents &amp; AI Assistant
                </h1>
                <p className="text-sm text-[#54626f] mt-1">
                  Upload your personal study PDFs or notes to generate clean summaries and chat with AI.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#e2eaeb] text-[#1F2937] hover:bg-[#54626f] hover:text-white transition shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>

          {/* Upload Form Card */}
          <div className="bg-white/90 border border-[#54626f]/20 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <UploadCloud className="w-5 h-5 text-[#54626f]" />
              <h2 className="text-lg font-bold text-[#1F2118]">Add New Study Material</h2>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#54626f] uppercase tracking-wider mb-1.5">
                    Document Title
                  </label>
                  <input
                    type="text"
                    placeholder="Enter custom title (optional)"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm focus:outline-none focus:border-[#54626f]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#54626f] uppercase tracking-wider mb-1.5">
                    Select PDF / Text File
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#54626f] text-sm file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#54626f] file:text-white hover:file:bg-[#1F2118] cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#54626f] uppercase tracking-wider mb-1.5">
                  Or Paste Lecture Notes Directly
                </label>
                <textarea
                  rows="3"
                  placeholder="Paste topic notes or text here..."
                  value={pastedContent}
                  onChange={(e) => setPastedContent(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#54626f]/25 bg-[#f8fafb] text-[#1F2118] text-sm focus:outline-none focus:border-[#54626f]"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || (!file && !pastedContent.trim())}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {uploading ? 'Uploading & Saving...' : 'Save Material'}
              </button>
            </form>
          </div>

          {/* Clean Summary Preview Banner */}
          {aiSummary && (
            <div className="bg-white/95 border border-[#54626f]/25 rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between border-b border-[#54626f]/15 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#54626f]" />
                  <h3 className="font-bold text-[#1F2118] text-base">
                    AI Summary — {aiSummary.title}
                  </h3>
                </div>
                <button
                  onClick={() => setAiSummary(null)}
                  className="p-1.5 rounded-lg text-[#54626f] hover:bg-[#e2eaeb] transition cursor-pointer"
                  aria-label="Close summary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="text-sm text-[#2C3539] whitespace-pre-line leading-relaxed bg-[#e2eaeb]/45 p-4 rounded-xl border border-[#54626f]/10">
                {aiSummary.summary}
              </div>
            </div>
          )}

          {/* Saved Documents List */}
          <div className="bg-white/90 border border-[#54626f]/20 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1F2118]">Your Saved Documents</h2>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e2eaeb] text-[#54626f]">
                {Number(documents.length)} Files
              </span>
            </div>

            {loading ? (
              <p className="text-sm text-[#54626f] py-6">Loading your documents...</p>
            ) : documents.length === 0 ? (
              <div className="text-center py-10 px-4 rounded-xl bg-[#e2eaeb]/40 border border-dashed border-[#54626f]/25">
                <FileText className="w-8 h-8 text-[#54626f]/60 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1F2118]">No documents found for your account</p>
                <p className="text-xs text-[#54626f] mt-1">
                  Upload a PDF or paste notes above to start studying.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    className="p-4 rounded-xl border border-[#54626f]/15 bg-[#f8fafb] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#e2eaeb] text-[#54626f] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-[#1F2118] text-sm truncate">{doc.title}</h3>
                        <p className="text-xs text-[#54626f] mt-0.5">
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
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition"
                      >
                        <span>Open &amp; Chat</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>

                      <button
                        onClick={() => handleAnalyze(doc)}
                        disabled={analyzingId === doc._id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#54626f] bg-[#e2eaeb] hover:bg-[#d2dee0] transition disabled:opacity-50 cursor-pointer"
                      >
                        {analyzingId === doc._id ? 'Summarizing...' : 'Quick Summary'}
                      </button>

                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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