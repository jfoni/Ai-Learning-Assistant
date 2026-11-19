import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../services/firebase';
import FlashcardPage from './FlashcardPage';

export default function FlashcardsListPage() {
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlashcards, setSelectedFlashcards] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);

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
      const res = await axios.get(`http://localhost:8000/api/documents/${uid}`);
      setDocuments(res.data?.data || []);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFlashcards = async (doc) => {
    try {
      setGeneratingId(doc._id);
      const res = await axios.post(`http://localhost:8000/api/flashcards/${doc._id}`, {
        userId,
      });

      const cards = res.data?.data?.flashcards || res.data?.data?.cards || res.data?.flashcards || [];
      if (cards.length > 0) {
        setSelectedFlashcards(cards);
      } else {
        alert('No flashcards returned from AI. Please try again.');
      }
    } catch (err) {
      console.error('Failed to load flashcards:', err);
      alert('Failed to generate flashcards. Check backend logs.');
    } finally {
      setGeneratingId(null);
    }
  };

  if (selectedFlashcards) {
    return (
      <div className="min-h-screen bg-[#e2eaeb] p-6 sm:p-8">
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
    <div className="min-h-screen bg-[#e2eaeb] p-6 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2118] mb-2">
          AI Flashcards Library
        </h1>
        <p className="text-[#54626f] text-sm mb-8">
          Select any of your uploaded study documents to generate and practice flashcards.
        </p>

        {loading ? (
          <p className="text-[#54626f] font-medium">Loading your study materials...</p>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#54626f]/20">
            <p className="text-[#54626f] font-medium">
              No documents found for your account. Upload study notes first.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {documents.map((doc) => (
              <div
                key={doc._id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-[#54626f]/20 flex flex-col justify-between"
              >
                <div>
                  <h3 className="font-bold text-[#1F2118] text-lg mb-1">{doc.title}</h3>
                  <p className="text-xs text-[#54626f]">
                    Added on:{' '}
                    {new Date(doc.uploadDate || doc.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#54626f]/10 flex justify-end">
                  <button
                    onClick={() => handleOpenFlashcards(doc)}
                    disabled={generatingId === doc._id}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {generatingId === doc._id ? 'Generating Cards...' : 'Practice Flashcards'}
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