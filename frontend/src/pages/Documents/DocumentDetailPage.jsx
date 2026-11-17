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

  // Chat & Actions States
  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'chat', 'explain'
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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
      setActiveTab('summary');
    } catch (err) {
      console.error('Failed to generate summary:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSendMessage = async (e, customMode = 'chat') => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await axios.post(`http://localhost:8000/api/documents/${id}/chat`, {
        question: userMsg,
        mode: customMode
      });
      const aiReply = res.data.data.answer;
      setMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong with the AI response.' }]);
    } finally {
      setChatLoading(false);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Panel: Document Info & Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 space-y-4 md:col-span-1 h-fit">
            <h1 className="text-xl font-bold text-[#1F2118]">{document.title}</h1>
            <p className="text-xs text-[#54626f]">
              Uploaded On: {new Date(document.uploadDate || document.createdAt).toLocaleDateString()}
            </p>

            <div className="pt-2 border-t border-gray-100 flex flex-col gap-2">
              <button
                onClick={handleGenerateSummary}
                disabled={analyzing}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-[#54626f] hover:bg-[#1F2118] transition-colors shadow-sm disabled:opacity-50"
              >
                {analyzing ? 'Generating...' : '✨ Generate AI Summary'}
              </button>

              {document.filePath && (
                <a
                  href={`http://localhost:8000/${document.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full text-center py-2.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                >
                  📄 View Original PDF
                </a>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold mt-4">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`flex-1 py-2 rounded-lg transition-all ${activeTab === 'summary' ? 'bg-white text-[#1F2118] shadow-sm' : 'text-gray-500'}`}
              >
                Summary
              </button>
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-2 rounded-lg transition-all ${activeTab === 'chat' ? 'bg-white text-[#1F2118] shadow-sm' : 'text-gray-500'}`}
              >
                AI Chat
              </button>
            </div>
          </div>

          {/* Right Panel: Dynamic Content (Summary or Chat Interface) */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 md:col-span-2 flex flex-col h-[600px]">
            {activeTab === 'summary' && (
              <div className="flex-1 overflow-y-auto pr-2">
                <h3 className="text-lg font-bold text-[#1F2118] mb-4">AI Study Summary & Guide</h3>
                {summary ? (
                  <p className="text-sm text-[#54626f] whitespace-pre-line leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-100">{summary}</p>
                ) : (
                  <div className="text-center py-20 text-gray-400">
                    <p>No summary generated yet.</p>
                    <p className="text-xs mt-1">Click "✨ Generate AI Summary" on the left panel to start!</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-bold text-[#1F2118] mb-3">Ask AI about this Document</h3>
                
                {/* Messages container */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-16 text-sm">
                      <p>Ask any question regarding your uploaded notes or request a concept breakdown!</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => (
                      <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-[#54626f] text-white rounded-br-none' : 'bg-white text-[#1F2118] border border-gray-200 rounded-bl-none shadow-sm'}`}>
                          <p className="whitespace-pre-line">{m.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white text-gray-400 border border-gray-200 p-3 rounded-2xl text-xs animate-pulse">
                        AI is thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <form onSubmit={(e) => handleSendMessage(e, 'chat')} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ask a question or explain a concept..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-[#54626f]"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !inputMessage.trim()}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#54626f] hover:bg-[#1F2118] transition-colors shadow-sm disabled:opacity-50"
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSendMessage(e, 'explain')}
                    disabled={chatLoading || !inputMessage.trim()}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    Explain Concept
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}