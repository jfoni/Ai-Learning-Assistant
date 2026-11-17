import React, { useState, useEffect } from 'react';
import { fetchDocuments, uploadDocument, analyzeDocument, deleteDocument } from '../../services/documentService';

export default function DocumentListPage() {
  const [documents, setDocuments] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [pastedContent, setPastedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [analyzingId, setAnalyzingId] = useState(null);

  const userId = "user_123";

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const data = await fetchDocuments(userId);
      setDocuments(data);
    } catch (err) {
      console.error('Error fetching docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file && !pastedContent) return;

    const formData = new FormData();
    formData.append('userId', userId);
    formData.append('title', title || (file ? file.name : 'Pasted Notes'));
    
    if (file) {
      formData.append('file', file);
    } else if (pastedContent) {
      // Create a text blob file if user pasted content directly
      const blob = new Blob([pastedContent], { type: 'text/plain' });
      formData.append('file', blob, (title || 'Notes') + '.txt');
    }

    try {
      setUploading(true);
      await uploadDocument(formData);
      setTitle('');
      setFile(null);
      setPastedContent('');
      loadDocs();
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (id) => {
    try {
      setAnalyzingId(id);
      setAiSummary(null);
      const summary = await analyzeDocument(id);
      setAiSummary({ id, summary });
    } catch (err) {
      console.error('AI Analysis failed:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      setDocuments(documents.filter(doc => doc._id !== id));
      if (aiSummary?.id === id) setAiSummary(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#e2eaeb] p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-[#1F2118]">Documents & AI Assistant</h1>
          <p className="text-[#54626f] text-sm mt-1">Upload study materials, paste lecture notes, and generate instant AI summaries.</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 mb-8">
          <h2 className="text-xl font-bold text-[#1F2118] mb-4">Add New Material</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#54626f] uppercase mb-1">Document Title</label>
                <input
                  type="text"
                  placeholder="Enter custom title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[#1F2118] focus:outline-none focus:border-[#54626f]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#54626f] uppercase mb-1">Select PDF / File</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-[#54626f] text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#54626f] file:text-white hover:file:bg-[#1F2118]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#54626f] uppercase mb-1">Or Paste Text / Lecture Notes Directly</label>
              <textarea
                rows="3"
                placeholder="Paste text, outline, or notes here if your PDF text cannot be read directly..."
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-[#1F2118] focus:outline-none focus:border-[#54626f] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={uploading || (!file && !pastedContent)}
              className="px-6 py-2.5 rounded-xl font-semibold text-white bg-[#54626f] hover:bg-[#1F2118] transition-colors shadow-sm disabled:opacity-50"
            >
              {uploading ? 'Processing & Saving...' : 'Save & Add Material'}
            </button>
          </form>
        </div>

        {aiSummary && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-amber-900">AI Study Summary</h3>
              <button onClick={() => setAiSummary(null)} className="text-xs text-amber-700 hover:underline">Close</button>
            </div>
            <p className="text-sm text-amber-800 whitespace-pre-line">{aiSummary.summary}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-[#1F2118] mb-4">Saved Documents & Notes</h2>
          
          {loading ? (
            <p className="text-[#54626f]">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="text-[#54626f] text-sm">No documents found yet. Upload a file or paste notes above!</p>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc._id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-between hover:bg-gray-100/50 transition-colors">
                  <div>
                    <h3 className="font-bold text-[#1F2118]">{doc.title}</h3>
                    <p className="text-xs text-[#54626f] mt-0.5">
                      Added on: {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyze(doc._id)}
                      disabled={analyzingId === doc._id}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      {analyzingId === doc._id ? 'Analyzing...' : 'AI Summary'}
                    </button>
                    {doc.filePath && (
                      <a
                        href={`http://localhost:8000/${doc.filePath}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#54626f] bg-white border border-gray-200 hover:bg-gray-50 shadow-sm"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(doc._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}