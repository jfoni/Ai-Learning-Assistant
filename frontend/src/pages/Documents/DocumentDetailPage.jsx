import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function DocumentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const fetchDocDetails = async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/documents`);
        const found = res.data.data.find(doc => doc._id === id);
        setDocument(found);
      } catch (err) {
        console.error('Error fetching document details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocDetails();
  }, [id]);

  const handleGenerateSummary = async () => {
    try {
      setAnalyzing(true);
      const res = await axios.post(`http://localhost:8000/api/documents/${id}/analyze`);
      setSummary(res.data.data.summary);
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) return <div className="p-8 text-[#54626f]">Loading document details...</div>;
  if (!document) return <div className="p-8 text-red-600">Document not found!</div>;

  return (
    <div className="min-h-screen bg-[#e2eaeb] p-8">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-[#54626f] hover:bg-gray-50 shadow-sm"
        >
          &larr; Back to Documents
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column: Info & AI Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
              <h1 className="text-2xl font-bold text-[#1F2118] mb-2">{document.title}</h1>
              <p className="text-xs text-[#54626f] mb-4">
                Uploaded On: {new Date(document.uploadDate || document.createdAt).toLocaleDateString()}
              </p>
              
              <button
                onClick={handleGenerateSummary}
                disabled={analyzing}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#54626f] hover:bg-[#1F2118] transition-colors shadow-sm disabled:opacity-50"
              >
                {analyzing ? 'Generating AI Study Summary...' : 'Generate AI Study Summary'}
              </button>
            </div>

            {summary && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                <h3 className="font-bold text-amber-900 mb-3 text-lg">AI Study Summary & Guide</h3>
                <p className="text-sm text-amber-800 whitespace-pre-line leading-relaxed">{summary}</p>
              </div>
            )}
          </div>

          {/* Right Column: File Preview / Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center items-center text-center">
            <h3 className="text-lg font-bold text-[#1F2118] mb-2">Document File Preview</h3>
            <p className="text-xs text-[#54626f] mb-6">File Name: {document.fileName || 'Pasted Notes'}</p>
            
            {document.filePath ? (
              <a
                href={`http://localhost:8000/${document.filePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Open Original File in New Tab
              </a>
            ) : (
              <p className="text-sm text-gray-500 italic">This item was created using direct text pasting.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}