import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  loadUserDocumentsForNotes,
  extractDocumentContentForNotes,
  uploadPdfOrDocumentForNotes,
  generateStudyNote,
  fetchUserStudyNotes,
  updateStudyNote,
  deleteStudyNote,
} from '../services/noteGeneratorService';
import { useTheme } from '../context/ThemeContext';
import AppSidebar from '../components/AppSidebar';
import NoteContentViewer from '../components/NoteContentViewer';
import {
  Menu,
  ArrowLeft,
  NotebookPen,
  Upload,
  FileText,
  Eye,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Edit3,
  Save,
  X,
  Copy,
  Check,
  Download,
  Trash2,
  BookOpen,
  AlertTriangle,
  ListChecks,
  Sigma,
  Lightbulb,
  Search,
  History,
  FolderOpen,
  Plus,
} from 'lucide-react';

const RAW_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8000';

const CLEAN_API_BASE = String(RAW_API_BASE)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

const NOTE_TYPES = [
  'Detailed Study Notes',
  'Short Revision Notes',
  'Exam Preparation Notes',
  'Topic-wise Notes',
];

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];
const LANGUAGES = ['English', 'Bangla', 'Bangla-English'];

const EXAMPLE_PALETTES = [
  {
    light: 'bg-amber-50/90 border-amber-300 text-amber-950',
    dark: 'bg-amber-950/35 border-amber-500/40 text-amber-100',
    dot: 'bg-amber-500',
  },
  {
    light: 'bg-sky-50/90 border-sky-300 text-sky-950',
    dark: 'bg-purple-950/35 border-purple-400/35 text-purple-100',
    dot: 'bg-purple-400',
  },
  {
    light: 'bg-emerald-50/90 border-emerald-300 text-emerald-950',
    dark: 'bg-emerald-950/35 border-emerald-500/40 text-emerald-100',
    dot: 'bg-emerald-500',
  },
  {
    light: 'bg-violet-50/90 border-violet-300 text-violet-950',
    dark: 'bg-violet-950/35 border-violet-400/40 text-violet-100',
    dot: 'bg-violet-400',
  },
  {
    light: 'bg-rose-50/90 border-rose-300 text-rose-950',
    dark: 'bg-rose-950/35 border-rose-500/40 text-rose-100',
    dot: 'bg-rose-500',
  },
];

const cleanText = (val = '') =>
  String(val || '')
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '')
    )
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*|__/g, '')
    .trim();

const splitIntoSentenceBlocks = (rawText = '') => {
  const cleaned = cleanText(rawText);
  if (!cleaned) return [];

  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks = [];
  const groupSizes = [2, 3, 2, 4, 5, 3];
  let patternIdx = 0;

  for (const para of paragraphs) {
    const sentences =
      para.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ||
      [para];

    if (sentences.length <= 2) {
      blocks.push(sentences.join(' '));
      continue;
    }

    let cursor = 0;
    while (cursor < sentences.length) {
      const targetCount = groupSizes[patternIdx % groupSizes.length];
      patternIdx += 1;

      const chunk = sentences
        .slice(cursor, cursor + targetCount)
        .join(' ')
        .trim();
      if (chunk) {
        blocks.push(chunk);
      }
      cursor += targetCount;
    }
  }

  return blocks;
};

const splitLabelAndBody = (text = '') => {
  const cleaned = cleanText(text);
  const colonIdx = cleaned.indexOf(':');
  if (
    colonIdx > 0 &&
    colonIdx <= 42 &&
    !cleaned.slice(0, colonIdx).includes('.')
  ) {
    return {
      label: cleaned.slice(0, colonIdx + 1),
      rest: cleaned.slice(colonIdx + 1).trim(),
    };
  }
  return { label: '', rest: cleaned };
};

const formatBytes = (bytes) => {
  const num = Number(bytes || 0);
  if (!num) return '';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

const getDocumentFileUrl = (doc) => {
  if (!doc) return '';
  const rawUrl =
    doc.fileUrl ||
    doc.url ||
    (doc.fileName ? `/uploads/${doc.fileName}` : '') ||
    (doc.filePath
      ? `/uploads/${String(doc.filePath).split(/[/\\]/).pop()}`
      : '');

  if (!rawUrl) return '';
  if (/^(https?:\/\/|blob:|data:)/i.test(rawUrl)) return rawUrl;
  return `${CLEAN_API_BASE}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
};

export default function NoteGeneratorPage() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [userId, setUserId] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Document (Stored previous documents — no delete here)
  const [storedDocuments, setStoredDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  // 2. Add New PDF (Separate uploaded PDFs — can delete from here, NOT from History)
  const [newPdfs, setNewPdfs] = useState([]);
  const [selectedNewPdfId, setSelectedNewPdfId] = useState('');

  // Which selector is currently active for View & Generate: 'document' | 'new_pdf'
  const [activeSourceType, setActiveSourceType] = useState('document');

  // Note options
  const [topicScope, setTopicScope] = useState('entire');
  const [topic, setTopic] = useState('');
  const [noteType, setNoteType] = useState('Detailed Study Notes');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [language, setLanguage] = useState('English');

  // File Viewer Modal
  const [viewerDoc, setViewerDoc] = useState(null);
  const [viewerPreviewText, setViewerPreviewText] = useState('');
  const [loadingPreviewText, setLoadingPreviewText] = useState(false);

  // History (Saved Notes) + Search Bar
  const [savedNotes, setSavedNotes] = useState([]);
  const [activeNote, setActiveNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedSearchNoteIds, setDismissedSearchNoteIds] = useState([]);

  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [copiedId, setCopiedId] = useState('');

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const selectedStoredDoc =
    storedDocuments.find(
      (d) => String(d._id || d.id) === String(selectedDocumentId)
    ) || null;

  const selectedNewPdf =
    newPdfs.find((p) => String(p._id || p.id) === String(selectedNewPdfId)) ||
    newPdfs[0] ||
    null;

  const currentlySelectedItem =
    activeSourceType === 'new_pdf' ? selectedNewPdf : selectedStoredDoc;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/overview');
    }
  };

  const loadSavedNotes = useCallback(async (uid) => {
    if (!uid) {
      setSavedNotes([]);
      return;
    }
    setLoadingNotes(true);
    try {
      const list = await fetchUserStudyNotes(uid);
      setSavedNotes(list);
      setActiveNote((prev) => prev || list[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      const uid = user?.uid || '';
      setUserId(uid);

      if (!uid) {
        setStoredDocuments([]);
        setSavedNotes([]);
        setActiveNote(null);
        return;
      }

      setLoadingDocs(true);
      try {
        const docs = await loadUserDocumentsForNotes(uid);
        setStoredDocuments(docs);
        if (docs.length > 0) {
          setSelectedDocumentId(
            (prev) => prev || String(docs[0]._id || docs[0].id)
          );
        }
      } finally {
        setLoadingDocs(false);
      }

      await loadSavedNotes(uid);
    });

    return () => unsub();
  }, [loadSavedNotes]);

  const handleCreateNewNote = () => {
    setActiveNote(null);
    setIsEditing(false);
    setEditTitle('');
    setEditContent('');
    setTopic('');
    setTopicScope('entire');
    setErrorMsg('');
    setStatusMsg('Ready to generate a new note. History remains saved.');
  };

  const handleViewSelected = async () => {
    const target = currentlySelectedItem;
    if (!target) return;

    setViewerDoc(target);
    setViewerPreviewText('');

    const fileUrl = getDocumentFileUrl(target);
    const isPdf =
      /\.pdf(\?|#|$)/i.test(fileUrl) ||
      /\.pdf$/i.test(target?.title || '') ||
      /\.pdf$/i.test(target?.fileName || '');

    if (!isPdf) {
      setLoadingPreviewText(true);
      try {
        const text = await extractDocumentContentForNotes(target);
        setViewerPreviewText(
          text || 'No preview content available for this file.'
        );
      } catch {
        setViewerPreviewText('Could not load file text preview.');
      } finally {
        setLoadingPreviewText(false);
      }
    }
  };

  const handleAddNewPdfChange = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const uid = userId || auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg('Please sign in to upload a PDF.');
      return;
    }

    setErrorMsg('');
    setStatusMsg('');
    setUploadingFile(true);

    try {
      const uploadedList = [];

      for (const file of files) {
        const localBlobUrl = URL.createObjectURL(file);
        try {
          const uploadedDoc = await uploadPdfOrDocumentForNotes({
            file,
            userId: uid,
          });
          const id = String(
            uploadedDoc._id ||
              uploadedDoc.id ||
              `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          );
          uploadedList.push({
            ...uploadedDoc,
            _id: uploadedDoc._id || id,
            id: uploadedDoc.id || id,
            title: uploadedDoc.title || file.name,
            fileName: uploadedDoc.fileName || file.name,
            fileSize: uploadedDoc.fileSize || file.size,
            fileUrl: uploadedDoc.fileUrl || localBlobUrl,
          });
        } catch {
          const id = `pdf-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`;
          uploadedList.push({
            _id: id,
            id,
            title: file.name,
            fileName: file.name,
            fileSize: file.size,
            fileUrl: localBlobUrl,
          });
        }
      }

      setNewPdfs((prev) => {
        const next = [...prev, ...uploadedList];
        const newest = uploadedList[uploadedList.length - 1];
        if (newest) {
          setSelectedNewPdfId(String(newest._id || newest.id));
        }
        return next;
      });

      setActiveSourceType('new_pdf');
      setStatusMsg(
        uploadedList.length > 1
          ? `${uploadedList.length} PDFs added.`
          : `"${uploadedList[0].title}" added.`
      );
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteNewPdf = (pdfId, e) => {
    if (e) e.stopPropagation();
    setNewPdfs((prev) => {
      const target = prev.find((p) => String(p._id || p.id) === String(pdfId));
      if (target?.fileUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(target.fileUrl);
      }
      const remaining = prev.filter(
        (p) => String(p._id || p.id) !== String(pdfId)
      );
      if (String(selectedNewPdfId) === String(pdfId)) {
        setSelectedNewPdfId(
          remaining[0] ? String(remaining[0]._id || remaining[0].id) : ''
        );
      }
      if (remaining.length === 0 && activeSourceType === 'new_pdf') {
        setActiveSourceType('document');
      }
      return remaining;
    });
  };

  const buildSourceForNoteGeneration = async () => {
    if (activeSourceType === 'new_pdf' && newPdfs.length > 0) {
      const sectionsText = [];
      const pdfTitles = [];

      for (let i = 0; i < newPdfs.length; i += 1) {
        const item = newPdfs[i];
        pdfTitles.push(item.title || `PDF ${i + 1}`);
        const extracted = await extractDocumentContentForNotes(item);
        sectionsText.push(`--- ${item.title} ---\n${extracted}`);
      }

      const dbDoc = newPdfs.find((p) =>
        /^[a-f\d]{24}$/i.test(String(p._id || p.id || ''))
      );

      return {
        documentId: dbDoc ? String(dbDoc._id || dbDoc.id) : '',
        documentTitle:
          newPdfs.length === 1
            ? newPdfs[0].title
            : `Merged PDFs (${pdfTitles.join(' + ')})`,
        documentContent: sectionsText.join('\n\n').slice(0, 60000),
      };
    }

    const doc = selectedStoredDoc;
    const text = await extractDocumentContentForNotes(doc);
    return {
      documentId: String(doc?._id || doc?.id || ''),
      documentTitle: doc?.title || 'Untitled Document',
      documentContent: text,
    };
  };

  const handleGenerateNote = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');
    setIsEditing(false);

    const uid = userId || auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg('Please sign in to generate and save study notes.');
      return;
    }

    if (!currentlySelectedItem) {
      setErrorMsg('Please select a document or add a PDF first.');
      return;
    }

    const effectiveScope =
      noteType === 'Topic-wise Notes' ? 'topic' : topicScope;

    if (effectiveScope === 'topic' && !topic.trim()) {
      setErrorMsg('Please enter a specific topic to generate topic-wise notes.');
      return;
    }

    setGenerating(true);
    try {
      const sourcePayload = await buildSourceForNoteGeneration();

      const res = await generateStudyNote({
        userId: uid,
        documentId: sourcePayload.documentId,
        documentTitle: sourcePayload.documentTitle,
        documentContent: sourcePayload.documentContent,
        topicScope: effectiveScope,
        topic: effectiveScope === 'topic' ? topic.trim() : '',
        noteType,
        difficulty,
        language,
      });

      if (res?.note) {
        setActiveNote(res.note);
        setSavedNotes((prev) => [
          res.note,
          ...prev.filter((n) => String(n._id) !== String(res.note._id)),
        ]);
        setStatusMsg('Study notes generated and saved to History.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to generate study notes.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectSavedNote = (note) => {
    setActiveNote(note);
    setIsEditing(false);
    setErrorMsg('');
    setStatusMsg('');
  };

  const handleStartEdit = (note) => {
    if (!note) return;
    setActiveNote(note);
    setEditTitle(note.title || '');
    setEditContent(note.contentText || '');
    setIsEditing(true);
    setErrorMsg('');
    setStatusMsg('');
  };

  const handleSaveEdit = async () => {
    if (!activeNote?._id) return;
    const uid = userId || auth.currentUser?.uid;
    if (!uid) return;

    if (!editTitle.trim() || !editContent.trim()) {
      setErrorMsg('Note title and content cannot be empty.');
      return;
    }

    setSavingEdit(true);
    setErrorMsg('');
    try {
      const res = await updateStudyNote(activeNote._id, {
        userId: uid,
        title: editTitle.trim(),
        contentText: editContent,
        noteType: activeNote.noteType,
        difficulty: activeNote.difficulty,
        language: activeNote.language,
      });

      if (res?.note) {
        setActiveNote(res.note);
        setSavedNotes((prev) =>
          prev.map((n) =>
            String(n._id) === String(res.note._id) ? res.note : n
          )
        );
        setIsEditing(false);
        setStatusMsg('Changes saved to your study notes.');
      }
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save note edits.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteHistoryNote = async (noteId, e) => {
    if (e) e.stopPropagation();
    const uid = userId || auth.currentUser?.uid;
    if (!uid || !noteId) return;

    setErrorMsg('');
    setStatusMsg('');
    try {
      await deleteStudyNote(noteId, uid);
      const remaining = savedNotes.filter(
        (n) => String(n._id) !== String(noteId)
      );
      setSavedNotes(remaining);
      if (activeNote && String(activeNote._id) === String(noteId)) {
        setActiveNote(remaining[0] || null);
        setIsEditing(false);
      }
      setStatusMsg('Deleted from History.');
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to delete study note.');
    }
  };

  const handleDismissSearchResult = (noteId, e) => {
    if (e) e.stopPropagation();
    setDismissedSearchNoteIds((prev) =>
      prev.includes(String(noteId)) ? prev : [...prev, String(noteId)]
    );
  };

  const handleCopyNote = async (note) => {
    if (!note) return;
    const textToCopy = note.contentText || note.title || '';
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedId(String(note._id));
      setTimeout(() => setCopiedId(''), 2000);
    } catch {
      setErrorMsg('Could not copy note to clipboard.');
    }
  };

  const handleDownloadNote = (note, ext = 'md') => {
    if (!note) return;
    const safeName =
      String(note.title || 'study-note')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'study-note';
    const content = note.contentText || '';
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchMatches = normalizedQuery
    ? savedNotes.filter((n) => {
        if (dismissedSearchNoteIds.includes(String(n._id))) return false;
        const hay = `${n.title || ''} ${n.documentTitle || ''} ${
          n.contentText || ''
        }`.toLowerCase();
        return hay.includes(normalizedQuery);
      })
    : [];

  const viewerUrl = getDocumentFileUrl(viewerDoc);
  const viewerIsPdf =
    /\.pdf(\?|#|$)/i.test(viewerUrl) ||
    /\.pdf$/i.test(viewerDoc?.title || '') ||
    /\.pdf$/i.test(viewerDoc?.fileName || '');

  const surfaceClass = isDark
    ? 'bg-[#231F2C] border-purple-400/20 text-[#F3F0FA]'
    : 'bg-white/95 border-[#54626f]/20 text-[#1F2118]';

  const nestedClass = isDark
    ? 'bg-[#1B1723] border-purple-400/15 text-[#EAE5F5]'
    : 'bg-[#f8fafb] border-[#54626f]/15 text-[#1F2118]';

  const inputClass = isDark
    ? 'bg-[#1B1723] border-purple-400/25 text-[#F3F0FA] placeholder-[#9B92AE] focus:border-purple-300'
    : 'bg-[#f8fafb] border-[#54626f]/25 text-[#1F2118] placeholder-[#6B7280] focus:border-[#54626f]';

  const primaryBtnClass = isDark
    ? 'bg-purple-300 text-[#18151F] hover:bg-purple-200'
    : 'bg-[#54626f] text-white hover:bg-[#1F2118]';

  const secondaryBtnClass = isDark
    ? 'bg-[#2E283D] text-[#EDE8F8] hover:bg-[#3A324D]'
    : 'bg-[#e2eaeb] text-[#1F2118] hover:bg-[#d2dee0]';

  const renderSentenceBlocks = (rawText = '', extraClass = '') => {
    const blocks = splitIntoSentenceBlocks(rawText);
    if (blocks.length === 0) return null;

    return (
      <div className="space-y-3">
        {blocks.map((block, bIdx) => (
          <React.Fragment key={bIdx}>
            <p
              className={`m-0 font-medium leading-relaxed ${
                isDark ? 'text-[#EAE5F5]' : 'text-[#1F2118]'
              } ${extraClass}`}
              style={{ fontSize: '20px', fontWeight: 500 }}
            >
              {block}
            </p>
            {bIdx < blocks.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderNiceUl = (items = [], isOrdered = false) => {
    const cleanItems = Array.isArray(items)
      ? items.map((x) => cleanText(x)).filter(Boolean)
      : [];
    if (cleanItems.length === 0) return null;

    return (
      <ul className="list-none m-0 p-0 space-y-2.5">
        {cleanItems.map((itemText, idx) => {
          const { label, rest } = splitLabelAndBody(itemText);
          const bodyBlocks = splitIntoSentenceBlocks(rest || itemText);

          return (
            <li
              key={idx}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                isDark
                  ? 'bg-[#231F2C] border-purple-400/20 text-[#F3F0FA]'
                  : 'bg-white border-[#54626f]/20 text-[#1F2118]'
              }`}
              style={{ fontSize: '20px' }}
            >
              <span
                className={`mt-1 shrink-0 font-bold ${
                  isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                }`}
                style={{ fontSize: '18px' }}
              >
                {isOrdered ? `${idx + 1}.` : '•'}
              </span>
              <div className="flex-1 space-y-2">
                {label && (
                  <span
                    className="font-bold mr-1.5"
                    style={{ fontSize: '20px', fontWeight: 700 }}
                  >
                    {label}
                  </span>
                )}
                {bodyBlocks.map((part, pIdx) => (
                  <React.Fragment key={pIdx}>
                    <span
                      className="font-medium leading-relaxed"
                      style={{ fontSize: '20px', fontWeight: 500 }}
                    >
                      {part}
                    </span>
                    {pIdx < bodyBlocks.length - 1 && (
                      <>
                        <br />
                        <br />
                      </>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div
      className={`min-h-screen flex relative ${
        isDark ? 'bg-[#18151F] text-[#F3F0FA]' : 'bg-[#e2eaeb] text-[#1F2118]'
      }`}
      style={{ fontSize: '20px', fontWeight: 500 }}
    >
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header + Search Bar */}
          <div
            className={`border rounded-3xl p-6 shadow-sm space-y-4 ${surfaceClass}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen((prev) => !prev)}
                  aria-label="Toggle sidebar"
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 ${secondaryBtnClass}`}
                >
                  <Menu className="w-6 h-6" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <NotebookPen
                      className={`w-8 h-8 shrink-0 ${
                        isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                      }`}
                    />
                    <h1
                      className="font-bold tracking-tight"
                      style={{ fontSize: '34px', lineHeight: 1.2, fontWeight: 700 }}
                    >
                      AI Note Generator
                    </h1>
                  </div>
                  <p
                    className={`mt-1 font-medium ${
                      isDark ? 'text-[#C5BCE0]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '19px', fontWeight: 500 }}
                  >
                    Generate structured topic-wise study &amp; exam notes from stored documents or added PDFs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={handleCreateNewNote}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold transition cursor-pointer ${primaryBtnClass}`}
                  style={{ fontSize: '17px', fontWeight: 700 }}
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Note</span>
                </button>

                <button
                  type="button"
                  onClick={handleBack}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border font-bold transition cursor-pointer ${
                    isDark
                      ? 'bg-[#2E283D] border-purple-400/20 text-[#F3F0FA] hover:bg-[#3A324D]'
                      : 'bg-[#e2eaeb] border-[#54626f]/20 text-[#1F2118] hover:bg-[#d2dee0]'
                  }`}
                  style={{ fontSize: '18px' }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="space-y-2">
              <div className="relative flex items-center gap-2">
                <Search
                  className={`w-5 h-5 absolute left-4 pointer-events-none ${
                    isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                  }`}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDismissedSearchNoteIds([]);
                  }}
                  placeholder="Search notes..."
                  className={`w-full rounded-2xl border pl-12 pr-24 py-2.5 font-medium outline-none ${inputClass}`}
                  style={{ fontSize: '18px', fontWeight: 500 }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDismissedSearchNoteIds([]);
                    }}
                    className={`absolute right-3 px-3 py-1 rounded-xl font-bold transition cursor-pointer ${secondaryBtnClass}`}
                    style={{ fontSize: '15px' }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {normalizedQuery && (
                <div className={`rounded-2xl border p-3 space-y-2 ${nestedClass}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="font-bold"
                      style={{ fontSize: '16px', fontWeight: 700 }}
                    >
                      Search Matches ({searchMatches.length})
                    </span>
                    {dismissedSearchNoteIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setDismissedSearchNoteIds([])}
                        className="font-semibold underline cursor-pointer"
                        style={{ fontSize: '15px' }}
                      >
                        Restore
                      </button>
                    )}
                  </div>

                  {searchMatches.length === 0 ? (
                    <p
                      className={`m-0 font-medium ${
                        isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                      }`}
                      style={{ fontSize: '17px', fontWeight: 500 }}
                    >
                      No matching notes found.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 list-none m-0 p-0">
                      {searchMatches.map((item) => (
                        <li
                          key={item._id}
                          onClick={() => handleSelectSavedNote(item)}
                          className={`rounded-xl border px-3.5 py-2 flex items-center justify-between gap-2 cursor-pointer ${surfaceClass}`}
                        >
                          <span
                            className="font-semibold truncate"
                            style={{ fontSize: '18px', fontWeight: 600 }}
                          >
                            {cleanText(item.title)}
                          </span>

                          <button
                            type="button"
                            onClick={(e) =>
                              handleDismissSearchResult(item._id, e)
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 font-semibold transition cursor-pointer shrink-0"
                            style={{ fontSize: '15px' }}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-8 min-w-0 space-y-6">
              <form
                onSubmit={handleGenerateNote}
                className={`border rounded-3xl p-6 shadow-sm space-y-5 ${surfaceClass}`}
              >
                {/* Option 1: Document */}
                <div
                  onClick={() =>
                    selectedStoredDoc && setActiveSourceType('document')
                  }
                  className={`rounded-2xl border p-4 space-y-2.5 transition ${
                    activeSourceType === 'document'
                      ? isDark
                        ? 'bg-[#2E2740] border-purple-300/60'
                        : 'bg-[#f1f6f7] border-[#54626f]'
                      : nestedClass
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="notes-document-select"
                      className="flex items-center gap-2 font-bold cursor-pointer"
                      style={{ fontSize: '19px', fontWeight: 700 }}
                    >
                      <FolderOpen
                        className={`w-5 h-5 ${
                          isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                        }`}
                      />
                      <span>Document</span>
                    </label>

                    {activeSourceType === 'document' && selectedStoredDoc && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSelected();
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${secondaryBtnClass}`}
                        style={{ fontSize: '16px' }}
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                    )}
                  </div>

                  {loadingDocs ? (
                    <div
                      className={`rounded-xl border px-4 py-2.5 font-medium ${nestedClass}`}
                      style={{ fontSize: '18px', fontWeight: 500 }}
                    >
                      Loading documents...
                    </div>
                  ) : (
                    <select
                      id="notes-document-select"
                      value={selectedDocumentId}
                      onChange={(e) => {
                        setSelectedDocumentId(e.target.value);
                        setActiveSourceType('document');
                      }}
                      className={`w-full rounded-xl border px-4 py-2.5 font-medium outline-none ${inputClass}`}
                      style={{ fontSize: '18px', fontWeight: 500 }}
                    >
                      {storedDocuments.length === 0 ? (
                        <option value="">No stored documents</option>
                      ) : (
                        storedDocuments.map((doc) => {
                          const id = String(doc._id || doc.id);
                          return (
                            <option key={id} value={id}>
                              {doc.title || 'Untitled Document'}
                            </option>
                          );
                        })
                      )}
                    </select>
                  )}
                </div>

                {/* Option 2: Add New PDF */}
                <div
                  onClick={() =>
                    newPdfs.length > 0 && setActiveSourceType('new_pdf')
                  }
                  className={`rounded-2xl border p-4 space-y-3 transition ${
                    activeSourceType === 'new_pdf' && newPdfs.length > 0
                      ? isDark
                        ? 'bg-[#2E2740] border-purple-300/60'
                        : 'bg-[#f1f6f7] border-[#54626f]'
                      : nestedClass
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className="font-bold"
                      style={{ fontSize: '19px', fontWeight: 700 }}
                    >
                      Add New PDF
                    </span>

                    <div className="flex items-center gap-2">
                      {activeSourceType === 'new_pdf' && selectedNewPdf && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewSelected();
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer ${secondaryBtnClass}`}
                          style={{ fontSize: '16px' }}
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        onChange={handleAddNewPdfChange}
                        className="hidden"
                      />

                      <button
                        type="button"
                        disabled={uploadingFile}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition cursor-pointer disabled:opacity-50 shrink-0 ${primaryBtnClass}`}
                        style={{ fontSize: '17px', fontWeight: 700 }}
                      >
                        <Upload className="w-4 h-4" />
                        <span>
                          {uploadingFile ? 'Uploading...' : 'Add New PDF'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {newPdfs.length > 0 && (
                    <ul className="space-y-2 list-none m-0 p-0">
                      {newPdfs.map((pdf) => {
                        const pid = String(pdf._id || pdf.id);
                        const isPicked =
                          activeSourceType === 'new_pdf' &&
                          String(selectedNewPdf?._id || selectedNewPdf?.id) ===
                            pid;

                        return (
                          <li
                            key={pid}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedNewPdfId(pid);
                              setActiveSourceType('new_pdf');
                            }}
                            className={`rounded-xl border px-3.5 py-2 flex items-center justify-between gap-2 cursor-pointer ${
                              isPicked
                                ? isDark
                                  ? 'bg-[#342C47] border-purple-300/60'
                                  : 'bg-[#e2eaeb] border-[#54626f]/50'
                                : surfaceClass
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText
                                className={`w-4 h-4 shrink-0 ${
                                  isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                                }`}
                              />
                              <span
                                className="font-semibold truncate"
                                style={{ fontSize: '18px', fontWeight: 600 }}
                              >
                                {cleanText(pdf.title)}
                              </span>
                              {formatBytes(pdf.fileSize) && (
                                <span
                                  className={`font-medium ${
                                    isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                                  }`}
                                  style={{ fontSize: '15px', fontWeight: 500 }}
                                >
                                  ({formatBytes(pdf.fileSize)})
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              aria-label="Delete added PDF"
                              onClick={(e) => handleDeleteNewPdf(pid, e)}
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Scope & Topic */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-5">
                    <label
                      htmlFor="notes-scope-select"
                      className="block font-bold mb-1.5"
                      style={{ fontSize: '18px', fontWeight: 700 }}
                    >
                      Scope
                    </label>
                    <select
                      id="notes-scope-select"
                      value={
                        noteType === 'Topic-wise Notes' ? 'topic' : topicScope
                      }
                      disabled={noteType === 'Topic-wise Notes'}
                      onChange={(e) => setTopicScope(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 font-medium outline-none ${inputClass}`}
                      style={{ fontSize: '18px', fontWeight: 500 }}
                    >
                      <option value="entire">Entire Document</option>
                      <option value="topic">Specific Topic</option>
                    </select>
                  </div>

                  {(noteType === 'Topic-wise Notes' ||
                    topicScope === 'topic') && (
                    <div className="sm:col-span-7">
                      <label
                        htmlFor="notes-topic-input"
                        className="block font-bold mb-1.5"
                        style={{ fontSize: '18px', fontWeight: 700 }}
                      >
                        Specific Topic
                      </label>
                      <input
                        id="notes-topic-input"
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Enter specific topic..."
                        className={`w-full rounded-2xl border px-4 py-3 font-medium outline-none ${inputClass}`}
                        style={{ fontSize: '19px', fontWeight: 500 }}
                      />
                    </div>
                  )}
                </div>

                {/* Note Format, Difficulty, Language */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="notes-type-select"
                      className="block font-bold mb-1.5"
                      style={{ fontSize: '18px', fontWeight: 700 }}
                    >
                      Note Format
                    </label>
                    <select
                      id="notes-type-select"
                      value={noteType}
                      onChange={(e) => {
                        const nextType = e.target.value;
                        setNoteType(nextType);
                        if (nextType === 'Topic-wise Notes') {
                          setTopicScope('topic');
                        }
                      }}
                      className={`w-full rounded-2xl border px-4 py-3 font-medium outline-none ${inputClass}`}
                      style={{ fontSize: '18px', fontWeight: 500 }}
                    >
                      {NOTE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="notes-difficulty-select"
                      className="block font-bold mb-1.5"
                      style={{ fontSize: '18px', fontWeight: 700 }}
                    >
                      Difficulty
                    </label>
                    <select
                      id="notes-difficulty-select"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 font-medium outline-none ${inputClass}`}
                      style={{ fontSize: '18px', fontWeight: 500 }}
                    >
                      {DIFFICULTIES.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="notes-language-select"
                      className="block font-bold mb-1.5"
                      style={{ fontSize: '18px', fontWeight: 700 }}
                    >
                      Language
                    </label>
                    <select
                      id="notes-language-select"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 font-medium outline-none ${inputClass}`}
                      style={{ fontSize: '18px', fontWeight: 500 }}
                    >
                      {LANGUAGES.map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {errorMsg && (
                  <div
                    className="rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-400 px-4 py-3 font-semibold"
                    style={{ fontSize: '18px', fontWeight: 600 }}
                  >
                    {cleanText(errorMsg)}
                  </div>
                )}

                {statusMsg && (
                  <div
                    className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-4 py-3 font-semibold"
                    style={{ fontSize: '18px', fontWeight: 600 }}
                  >
                    {cleanText(statusMsg)}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3">
                  {activeNote && (
                    <button
                      type="button"
                      disabled={generating || !currentlySelectedItem}
                      onClick={handleGenerateNote}
                      className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-bold transition cursor-pointer disabled:opacity-50 ${secondaryBtnClass}`}
                      style={{ fontSize: '18px', fontWeight: 700 }}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Regenerate</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={generating || !currentlySelectedItem}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition cursor-pointer disabled:opacity-50 ${primaryBtnClass}`}
                    style={{ fontSize: '19px', fontWeight: 700 }}
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>
                      {generating ? 'Generating...' : 'Generate Notes'}
                    </span>
                  </button>
                </div>
              </form>

              {!generating && !activeNote && (
                <div
                  className={`border rounded-3xl p-8 text-center space-y-3 ${surfaceClass}`}
                >
                  <BookOpen
                    className={`w-12 h-12 mx-auto ${
                      isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                    }`}
                  />
                  <h2
                    className="font-bold"
                    style={{ fontSize: '26px', fontWeight: 700 }}
                  >
                    Create a New Study Note
                  </h2>
                  <p
                    className={`max-w-xl mx-auto font-medium ${
                      isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '19px', fontWeight: 500 }}
                  >
                    Select a document or add a PDF above and click Generate Notes. Any previous notes stay safely in History.
                  </p>
                </div>
              )}

              {activeNote && (
                <div
                  className={`border rounded-3xl p-6 shadow-sm space-y-6 ${surfaceClass}`}
                >
                  <div
                    className={`flex flex-wrap items-start justify-between gap-4 border-b pb-4 ${
                      isDark ? 'border-purple-400/20' : 'border-[#54626f]/20'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <span
                        className={`font-bold uppercase tracking-wider ${
                          isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                        }`}
                        style={{ fontSize: '14px', fontWeight: 700 }}
                      >
                        {cleanText(activeNote.documentTitle)} •{' '}
                        {activeNote.noteType} • {activeNote.difficulty} •{' '}
                        {activeNote.language}
                      </span>
                      <h2
                        className="font-bold break-words"
                        style={{ fontSize: '28px', lineHeight: 1.2, fontWeight: 700 }}
                      >
                        {cleanText(activeNote.title)}
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isEditing ? (
                        <button
                          type="button"
                          onClick={() => handleStartEdit(activeNote)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer ${secondaryBtnClass}`}
                          style={{ fontSize: '16px' }}
                        >
                          <Edit3 className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={savingEdit}
                            onClick={handleSaveEdit}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition cursor-pointer ${primaryBtnClass}`}
                            style={{ fontSize: '16px' }}
                          >
                            <Save className="w-4 h-4" />
                            <span>{savingEdit ? 'Saving...' : 'Save'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer ${secondaryBtnClass}`}
                            style={{ fontSize: '16px' }}
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleCopyNote(activeNote)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer ${secondaryBtnClass}`}
                        style={{ fontSize: '16px' }}
                      >
                        {copiedId === String(activeNote._id) ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadNote(activeNote, 'md')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold transition cursor-pointer ${secondaryBtnClass}`}
                        style={{ fontSize: '16px' }}
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteHistoryNote(activeNote._id, e)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition cursor-pointer"
                        style={{ fontSize: '16px' }}
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div>
                        <label
                          className="block font-bold mb-1"
                          style={{ fontSize: '18px', fontWeight: 700 }}
                        >
                          Note Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={`w-full rounded-2xl border px-4 py-2.5 font-bold outline-none ${inputClass}`}
                          style={{ fontSize: '20px', fontWeight: 700 }}
                        />
                      </div>
                      <div>
                        <label
                          className="block font-bold mb-1"
                          style={{ fontSize: '18px', fontWeight: 700 }}
                        >
                          Formatted Note Content
                        </label>
                        <textarea
                          rows={14}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className={`w-full rounded-2xl border p-4 font-mono font-medium leading-relaxed outline-none ${inputClass}`}
                          style={{ fontSize: '18px', fontWeight: 500 }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {activeNote.sections?.length > 0 ? (
                        <div className="space-y-5">
                          {activeNote.sections.map((sec, idx) => (
                            <div
                              key={idx}
                              className={`rounded-2xl border p-5 sm:p-6 space-y-4 ${nestedClass}`}
                            >
                              {sec.heading && (
                                <h3
                                  className="font-bold m-0"
                                  style={{
                                    fontSize: '25px',
                                    lineHeight: 1.25,
                                    fontWeight: 700,
                                  }}
                                >
                                  {idx + 1}. {cleanText(sec.heading)}
                                </h3>
                              )}

                              {sec.subheadings?.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {sec.subheadings.map((sub, sIdx) => (
                                    <span
                                      key={sIdx}
                                      className={`px-3.5 py-1 rounded-full font-bold ${
                                        isDark
                                          ? 'bg-[#2E283D] text-purple-300'
                                          : 'bg-[#e2eaeb] text-[#1F2118]'
                                      }`}
                                      style={{ fontSize: '15px', fontWeight: 700 }}
                                    >
                                      {cleanText(sub)}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {sec.definition && (
                                <div className="space-y-1.5">
                                  <span
                                    className="font-bold block"
                                    style={{ fontSize: '20px', fontWeight: 700 }}
                                  >
                                    Definition:
                                  </span>
                                  {renderSentenceBlocks(sec.definition)}
                                </div>
                              )}

                              {sec.explanation && renderSentenceBlocks(sec.explanation)}

                              {sec.bulletPoints?.length > 0 && (
                                <div className="space-y-2">
                                  <div
                                    className="font-bold"
                                    style={{ fontSize: '19px', fontWeight: 700 }}
                                  >
                                    Key Points
                                  </div>
                                  {renderNiceUl(sec.bulletPoints, false)}
                                </div>
                              )}

                              {sec.steps?.length > 0 && (
                                <div className="space-y-2">
                                  <div
                                    className="font-bold"
                                    style={{ fontSize: '19px', fontWeight: 700 }}
                                  >
                                    Steps / Working Principle
                                  </div>
                                  {renderNiceUl(sec.steps, true)}
                                </div>
                              )}

                              {sec.typesOrClassifications?.length > 0 && (
                                <div className="space-y-2">
                                  <div
                                    className="font-bold"
                                    style={{ fontSize: '19px', fontWeight: 700 }}
                                  >
                                    Types &amp; Classifications
                                  </div>
                                  {renderNiceUl(
                                    sec.typesOrClassifications,
                                    false
                                  )}
                                </div>
                              )}

                              {(sec.advantages?.length > 0 ||
                                sec.disadvantages?.length > 0) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                                  {sec.advantages?.length > 0 && (
                                    <div className="space-y-2">
                                      <div
                                        className="font-bold text-emerald-400"
                                        style={{ fontSize: '18px', fontWeight: 700 }}
                                      >
                                        Advantages
                                      </div>
                                      {renderNiceUl(sec.advantages, false)}
                                    </div>
                                  )}
                                  {sec.disadvantages?.length > 0 && (
                                    <div className="space-y-2">
                                      <div
                                        className="font-bold text-rose-400"
                                        style={{ fontSize: '18px', fontWeight: 700 }}
                                      >
                                        Disadvantages
                                      </div>
                                      {renderNiceUl(sec.disadvantages, false)}
                                    </div>
                                  )}
                                </div>
                              )}

                              {sec.comparisons?.length > 0 && (
                                <div className="space-y-2">
                                  <div
                                    className="font-bold"
                                    style={{ fontSize: '19px', fontWeight: 700 }}
                                  >
                                    Key Differences &amp; Comparisons
                                  </div>
                                  {renderNiceUl(sec.comparisons, false)}
                                </div>
                              )}

                              {sec.tableMarkdown && (
                                <pre
                                  className={`rounded-xl border p-4 overflow-x-auto font-mono font-medium m-0 ${
                                    isDark
                                      ? 'bg-[#231F2C] border-purple-400/20 text-[#EAE5F5]'
                                      : 'bg-white border-[#54626f]/20 text-[#1F2118]'
                                  }`}
                                  style={{ fontSize: '17px', fontWeight: 500 }}
                                >
                                  {sec.tableMarkdown}
                                </pre>
                              )}

                              {sec.codeSnippet && (
                                <pre
                                  className={`rounded-xl border p-4 overflow-x-auto font-mono font-medium m-0 ${
                                    isDark
                                      ? 'bg-[#14111A] border-purple-400/20 text-purple-300'
                                      : 'bg-[#1F2118] border-[#1F2118] text-[#F3F4F6]'
                                  }`}
                                  style={{ fontSize: '17px', fontWeight: 500 }}
                                >
                                  {sec.codeSnippet}
                                </pre>
                              )}

                              {sec.examples?.length > 0 && (
                                <div
                                  className={`rounded-2xl border p-4 sm:p-5 space-y-3 ${
                                    isDark
                                      ? 'bg-[#241F30] border-purple-400/20'
                                      : 'bg-[#FFFDF8] border-[#E5DEC9]'
                                  }`}
                                >
                                  <div
                                    className={`flex items-center gap-2 font-bold ${
                                      isDark
                                        ? 'text-amber-300'
                                        : 'text-amber-800'
                                    }`}
                                    style={{ fontSize: '19px', fontWeight: 700 }}
                                  >
                                    <Lightbulb className="w-5 h-5 shrink-0 text-amber-400" />
                                    <span>Examples &amp; Applications</span>
                                  </div>

                                  <ul className="list-none m-0 p-0 space-y-3">
                                    {sec.examples.map((ex, eIdx) => {
                                      const palette =
                                        EXAMPLE_PALETTES[
                                          eIdx % EXAMPLE_PALETTES.length
                                        ];
                                      const exBlocks = splitIntoSentenceBlocks(ex);
                                      const { label, rest } = splitLabelAndBody(
                                        exBlocks[0] || ''
                                      );

                                      return (
                                        <li
                                          key={eIdx}
                                          className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                                            isDark ? palette.dark : palette.light
                                          }`}
                                          style={{ fontSize: '20px' }}
                                        >
                                          <span
                                            className={`mt-2.5 h-2.5 w-2.5 shrink-0 rounded-full ${palette.dot}`}
                                          />
                                          <div className="flex-1 space-y-2">
                                            {exBlocks.map((blk, bIdx) => {
                                              if (bIdx === 0 && label) {
                                                return (
                                                  <React.Fragment key={bIdx}>
                                                    <p
                                                      className="m-0 font-medium leading-relaxed"
                                                      style={{
                                                        fontSize: '20px',
                                                        fontWeight: 500,
                                                      }}
                                                    >
                                                      <span
                                                        className="font-bold mr-1.5"
                                                        style={{ fontWeight: 700 }}
                                                      >
                                                        {label}
                                                      </span>
                                                      {rest}
                                                    </p>
                                                    {bIdx <
                                                      exBlocks.length - 1 && (
                                                      <br />
                                                    )}
                                                  </React.Fragment>
                                                );
                                              }
                                              return (
                                                <React.Fragment key={bIdx}>
                                                  <p
                                                    className="m-0 font-medium leading-relaxed"
                                                    style={{
                                                      fontSize: '20px',
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    {blk}
                                                  </p>
                                                  {bIdx <
                                                    exBlocks.length - 1 && (
                                                    <br />
                                                  )}
                                                </React.Fragment>
                                              );
                                            })}
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              {sec.formulas?.length > 0 && (
                                <div className="pt-1 space-y-2">
                                  <div
                                    className={`flex items-center gap-1.5 font-bold ${
                                      isDark
                                        ? 'text-purple-300'
                                        : 'text-[#2F5D68]'
                                    }`}
                                    style={{ fontSize: '19px', fontWeight: 700 }}
                                  >
                                    <Sigma className="w-5 h-5 shrink-0" />
                                    <span>Formulas</span>
                                  </div>
                                  {renderNiceUl(sec.formulas, false)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <NoteContentViewer note={activeNote} />
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeNote.definitions?.length > 0 && (
                          <div
                            className={`rounded-2xl border p-5 space-y-3 ${nestedClass}`}
                          >
                            <h3
                              className="font-bold m-0"
                              style={{ fontSize: '21px', fontWeight: 700 }}
                            >
                              Important Definitions
                            </h3>
                            {renderNiceUl(
                              activeNote.definitions.map((def) =>
                                def.term
                                  ? `${cleanText(def.term)}: ${cleanText(
                                      def.definition
                                    )}`
                                  : cleanText(def.definition)
                              ),
                              false
                            )}
                          </div>
                        )}

                        {activeNote.keyConcepts?.length > 0 && (
                          <div
                            className={`rounded-2xl border p-5 space-y-3 ${nestedClass}`}
                          >
                            <h3
                              className="font-bold m-0"
                              style={{ fontSize: '21px', fontWeight: 700 }}
                            >
                              Key Concepts
                            </h3>
                            {renderNiceUl(activeNote.keyConcepts, false)}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeNote.formulas?.length > 0 && (
                          <div
                            className={`rounded-2xl border p-5 space-y-3 ${nestedClass}`}
                          >
                            <div
                              className="flex items-center gap-2 font-bold"
                              style={{ fontSize: '21px', fontWeight: 700 }}
                            >
                              <Sigma className="w-5 h-5 shrink-0" />
                              <span>Important Formulas</span>
                            </div>
                            {renderNiceUl(activeNote.formulas, false)}
                          </div>
                        )}

                        {activeNote.importantPoints?.length > 0 && (
                          <div
                            className={`rounded-2xl border p-5 space-y-3 ${nestedClass}`}
                          >
                            <div
                              className="flex items-center gap-2 font-bold text-emerald-400"
                              style={{ fontSize: '21px', fontWeight: 700 }}
                            >
                              <ListChecks className="w-5 h-5 shrink-0" />
                              <span>Points to Remember</span>
                            </div>
                            {renderNiceUl(activeNote.importantPoints, false)}
                          </div>
                        )}
                      </div>

                      {activeNote.sourceLimitations?.length > 0 && (
                        <div
                          className={`rounded-2xl border p-5 space-y-3 ${nestedClass}`}
                        >
                          <div
                            className="flex items-center gap-2 font-bold text-amber-400"
                            style={{ fontSize: '20px', fontWeight: 700 }}
                          >
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <span>Source Grounding &amp; Missing Details</span>
                          </div>
                          {renderNiceUl(activeNote.sourceLimitations, false)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: History */}
            <div className="lg:col-span-4 min-w-0">
              <div
                className={`border rounded-3xl p-5 shadow-sm space-y-4 h-fit ${surfaceClass}`}
              >
                <div className="flex items-center gap-2">
                  <History
                    className={`w-6 h-6 ${
                      isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                    }`}
                  />
                  <h2
                    className="font-bold m-0"
                    style={{ fontSize: '24px', fontWeight: 700 }}
                  >
                    History
                  </h2>
                </div>

                {loadingNotes ? (
                  <p
                    className={`font-medium ${
                      isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '18px', fontWeight: 500 }}
                  >
                    Loading history...
                  </p>
                ) : savedNotes.length === 0 ? (
                  <p
                    className={`font-medium ${
                      isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                    }`}
                    style={{ fontSize: '18px', fontWeight: 500 }}
                  >
                    Saved study notes appear here.
                  </p>
                ) : (
                  <ul className="space-y-3 list-none m-0 p-0 max-h-[720px] overflow-y-auto pr-1">
                    {savedNotes.map((note) => {
                      const isSelected =
                        activeNote && String(activeNote._id) === String(note._id);

                      return (
                        <li
                          key={note._id}
                          onClick={() => handleSelectSavedNote(note)}
                          className={`rounded-2xl border p-4 transition cursor-pointer space-y-2 ${
                            isSelected
                              ? isDark
                                ? 'bg-[#342C47] border-purple-300/50'
                                : 'bg-[#e2eaeb] border-[#54626f]/40'
                              : `${nestedClass} hover:opacity-90`
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="font-bold leading-snug m-0"
                              style={{ fontSize: '19px', fontWeight: 700 }}
                            >
                              {cleanText(note.title)}
                            </p>
                            <button
                              type="button"
                              aria-label="Delete note from history"
                              onClick={(e) =>
                                handleDeleteHistoryNote(note._id, e)
                              }
                              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/15 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <p
                            className={`m-0 truncate font-medium ${
                              isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                            }`}
                            style={{ fontSize: '16px', fontWeight: 500 }}
                          >
                            {cleanText(note.documentTitle)}
                          </p>

                          <div
                            className={`flex items-center justify-between font-semibold ${
                              isDark ? 'text-[#B5ACC9]' : 'text-[#54626f]'
                            }`}
                            style={{ fontSize: '15px', fontWeight: 600 }}
                          >
                            <span>{note.noteType}</span>
                            <span>{note.language}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {viewerDoc && (
        <div className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-5xl h-[85vh] border rounded-3xl shadow-xl flex flex-col overflow-hidden ${surfaceClass}`}
          >
            <div
              className={`flex items-center justify-between gap-3 px-6 py-4 border-b ${
                isDark ? 'border-purple-400/20' : 'border-[#54626f]/20'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText
                  className={`w-5 h-5 shrink-0 ${
                    isDark ? 'text-purple-300' : 'text-[#2F5D68]'
                  }`}
                />
                <h3
                  className="font-bold truncate m-0"
                  style={{ fontSize: '21px', fontWeight: 700 }}
                >
                  {cleanText(viewerDoc.title)}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {viewerUrl && (
                  <a
                    href={viewerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition ${secondaryBtnClass}`}
                    style={{ fontSize: '16px' }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Tab</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setViewerDoc(null)}
                  aria-label="Close file viewer"
                  className={`p-2 rounded-xl transition cursor-pointer ${secondaryBtnClass}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 p-4">
              {viewerIsPdf && viewerUrl ? (
                <iframe
                  src={viewerUrl}
                  title={viewerDoc.title || 'PDF File'}
                  className="w-full h-full rounded-2xl border border-[#54626f]/20 bg-white"
                />
              ) : (
                <div
                  className={`w-full h-full rounded-2xl border p-5 overflow-y-auto whitespace-pre-wrap font-mono font-medium ${nestedClass}`}
                  style={{ fontSize: '17px', fontWeight: 500 }}
                >
                  {loadingPreviewText
                    ? 'Loading file content...'
                    : viewerPreviewText}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}