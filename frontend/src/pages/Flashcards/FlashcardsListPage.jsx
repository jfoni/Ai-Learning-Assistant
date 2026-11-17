import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FlashcardPage from './FlashcardPage';

export default function FlashcardsListPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlashcards, setSelectedFlashcards] = useState(null);
  const [selectedTitle, setSelectedTitle] = useState('');
  const [generatingId, setGeneratingId] = useState(null);

  const userId = "user_123";

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/documents/${userId}`);
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFlashcards = async (doc) => {
    try {
      setGeneratingId(doc._id);
      const res = await axios.post(`http://localhost:8000/api/flashcards/${doc._id}`);
      
      console.log("API Response:", res.data); // কনসোলে রেসপন্স চেক করার জন্য

      // ব্যাকএন্ড থেকে আসা ডেটা স্ট্রাকচার চেক করে সেট করছি
      const cards = res.data?.data?.flashcards || res.data?.flashcards || [];
      if (cards.length > 0) {
        setSelectedFlashcards(cards);
        setSelectedTitle(doc.title);
      } else {
        alert('No flashcards returned from AI. Please try again.');
      }
    } catch (err) {
      console.error('Failed to load flashcards:', err);
      alert('Failed to generate flashcards. Check backend terminal for errors.');
    } finally {
      setGeneratingId(null);
    }
  };

  if (selectedFlashcards) {
    return (
      <div className="min-h-screen bg-[#e2eaeb] p-8">
        <div className="max-w-4xl mx-auto">
          <FlashcardPage 
            flashcards={selectedFlashcards} 
            onBack={() => setSelectedFlashcards(null)} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e2eaeb] p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-extrabold text-[#1F2118] mb-2">AI Flashcards Library</h1>
        <p className="text-[#54626f] text-sm mb-8">Select any of your uploaded study documents to generate and practice interactive flashcards.</p>

        {loading ? (
          <p className="text-[#54626f]">Loading study materials...</p>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <p className="text-[#54626f]">No documents found. Please upload study notes first!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.map((doc) => (
              <div key={doc._id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-[#1F2118] text-lg mb-1">{doc.title}</h3>
                  <p className="text-xs text-[#54626f]">Added on: {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString()}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleOpenFlashcards(doc)}
                    disabled={generatingId === doc._id}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#54626f] hover:bg-[#1F2118] transition-colors shadow-sm disabled:opacity-50"
                  >
                    {generatingId === doc._id ? 'Generating AI Cards...' : 'Practice Flashcards ✨'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}