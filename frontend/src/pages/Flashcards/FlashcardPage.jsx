import React, { useState } from 'react';

export default function FlashcardPage({ flashcards = [], onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No flashcards available to display.</p>
        <button 
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-[#54626f] text-white rounded-xl text-xs font-semibold hover:bg-[#1F2118]"
        >
          &larr; Back
        </button>
      </div>
    );
  }

  const currentCard = flashcards[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[500px]">
      <div className="w-full max-w-xl flex justify-between items-center mb-6">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-[#54626f] hover:bg-gray-50 shadow-sm"
        >
          &larr; Back
        </button>
        <span className="text-xs font-semibold text-[#54626f]">
          Card {currentIndex + 1} of {flashcards.length}
        </span>
      </div>

      {/* Flashcard Box */}
      <div 
        onClick={() => setIsFlipped(!isFlipped)}
        className="w-full max-w-xl h-80 bg-gradient-to-br from-gray-900 to-[#54626f] text-white rounded-3xl p-8 shadow-xl cursor-pointer flex flex-col justify-between items-center text-center transition-transform hover:scale-[1.01]"
      >
        <div className="w-full flex justify-between text-xs text-gray-300 font-semibold uppercase tracking-wider">
          <span>Study Flashcard</span>
          <span>{isFlipped ? '💡 Answer' : '❓ Question (Click to Flip)'}</span>
        </div>

        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xl font-medium leading-relaxed">
            {isFlipped ? currentCard.answer : currentCard.question}
          </p>
        </div>

        <span className="text-xs text-gray-300 italic">Click anywhere on card to flip</span>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={() => {
            setIsFlipped(false);
            setCurrentIndex(prev => (prev > 0 ? prev - 1 : flashcards.length - 1));
          }}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#54626f] bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
        >
          &larr; Previous
        </button>
        
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#54626f] hover:bg-[#1F2118] transition-colors shadow-sm"
        >
          {isFlipped ? 'Show Question' : 'Flip to Answer'}
        </button>

        <button
          onClick={() => {
            setIsFlipped(false);
            setCurrentIndex(prev => (prev < flashcards.length - 1 ? prev + 1 : 0));
          }}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#54626f] bg-white border border-gray-200 hover:bg-gray-50 shadow-sm transition-colors"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}