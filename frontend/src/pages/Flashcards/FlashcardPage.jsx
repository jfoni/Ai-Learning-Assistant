import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

// Strip raw $ signs and format **bold** segments
const formatInlineText = (text, isAnswer = false) => {
  if (!text) return null;
  const sanitized = String(text).replace(/\$([^$]+)\$/g, '$1');
  const tokens = sanitized.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return tokens.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong
          key={idx}
          className={
            isAnswer
              ? 'font-black text-[#1f3b4d] bg-[#e2eaeb] px-2 py-0.5 rounded-md'
              : 'font-black text-[#6b4c35] bg-[#6b4c35]/10 px-2 py-0.5 rounded-md'
          }
        >
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key="{idx}">{part}</React.Fragment>;
  });
};

// Render card body with distinct styling for paragraphs and bullet lists (ul)
const renderCardBody = (text, isAnswer = false) => {
  if (!text) return null;

  const lines = String(text)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const blocks = [];
  let ulItems = [];

  const flushUl = (keyPrefix) => {
    if (ulItems.length > 0) {
      blocks.push(
        <ul
          key={`${keyPrefix}-ul`}
          className="my-3.5 space-y-2.5 rounded-2xl bg-[#eef4f5] border border-[#1f3b4d]/15 p-4"
        >
          {ulItems.map((bulletText, bIdx) => (
            <li
              key={bIdx}
              className="flex items-start gap-3 text-base sm:text-lg font-medium text-[#1f3b4d] leading-relaxed"
            >
              <span className="mt-2 w-2.5 h-2.5 rounded-full bg-[#6b4c35] shrink-0" />
              <span className="flex-1 text-[#1f3b4d]">
                {formatInlineText(bulletText, true)}
              </span>
            </li>
          ))}
        </ul>
      );
      ulItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      ulItems.push(bulletMatch[1]);
      return;
    }

    flushUl(`line-${idx}`);
    blocks.push(
      <p
        key={`p-${idx}`}
        className={
          isAnswer
            ? 'text-lg sm:text-xl font-semibold text-[#1F2118] leading-relaxed my-2'
            : 'text-xl sm:text-2xl font-black text-[#1F2118] leading-snug my-1'
        }
      >
        {formatInlineText(line, isAnswer)}
      </p>
    );
  });

  flushUl('end');

  return <div className="space-y-1">{blocks}</div>;
};

export default function FlashcardPage({ flashcards = [], onBack }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    return (
      <div className="bg-white/95 border border-[#54626f]/20 rounded-2xl p-8 text-center shadow-sm mt-4">
        <p className="text-base font-bold text-[#1F2118] mb-4">
          No flashcards available in this deck.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4"/>
            <span>Back to Flashcards</span>
          </button>
        )}
      </div>
    );
  }

  const card = flashcards[currentIndex] || {};
  const totalCards = Number(flashcards.length);
  const cardDifficulty = String(card.difficulty || 'medium').toUpperCase();

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % totalCards);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
  };

  const handleFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  return (
    <div className="mt-4 space-y-5">
      {/* Top Bar: Back Button & Progress Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#54626f]/20 text-sm font-bold text-[#1f3b4d] hover:bg-[#f8fafb] shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#6b4c35]"/>
            <span>Back to Decks</span>
          </button>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#54626f]/20 text-xs sm:text-sm font-extrabold text-[#1f3b4d] shadow-2xs">
            Card {Number(currentIndex + 1)} of {totalCards}
          </span>
          <span className="px-3.5 py-1.5 rounded-full bg-[#6b4c35]/12 text-xs sm:text-sm font-extrabold text-[#6b4c35]">
            {cardDifficulty}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2.5 rounded-full bg-white/80 border border-[#54626f]/15 overflow-hidden">
        <div
          className="h-full bg-[#54626f] transition-all duration-300 rounded-full"
          style={{ width: `${Math.round(((currentIndex + 1) / totalCards) * 100)}%` }}
        />
      </div>

      {/* Main Flashcard Surface */}
      <div
        onClick={handleFlip}
        className={`rounded-3xl p-7 sm:p-10 min-h-[300px] sm:min-h-[340px] flex flex-col justify-between shadow-md border transition cursor-pointer select-none ${
          isFlipped
            ? 'bg-white border-[#54626f]/30'
            : 'bg-white/95 border-[#54626f]/20 hover:border-[#54626f]/40'
        }`}
      >
        {/* Card Side Label */}
        <div className="flex items-center justify-between gap-2 border-b border-[#54626f]/12 pb-4">
          {!isFlipped ? (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#e2eaeb] text-[#1f3b4d] text-xs sm:text-sm font-black uppercase tracking-wider">
              <HelpCircle className="w-4 h-4 text-[#6b4c35]"/>
              <span>Question</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#6b4c35]/12 text-[#6b4c35] text-xs sm:text-sm font-black uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-[#6b4c35]"/>
              <span>Answer</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#54626f]">
            <RotateCw className="w-3.5 h-3.5 text-[#6b4c35]"/>
            <span>Click card to {isFlipped ? 'see question' : 'reveal answer'}</span>
          </span>
        </div>

        {/* Question / Answer Main Text */}
        <div className="my-auto py-6">
          {!isFlipped ? (
            renderCardBody(card.question, false)
          ) : (
            <div className="rounded-2xl bg-[#f8fafb] border-l-4 border-[#6b4c35] p-5 sm:p-6">
              {renderCardBody(card.answer, true)}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="pt-3 border-t border-[#54626f]/10 flex items-center justify-between text-xs sm:text-sm font-semibold text-[#54626f]/80">
          <span>Easy-to-follow exam prep</span>
          <span className="text-[#1f3b4d] font-bold">
            {isFlipped ? 'Showing Answer' : 'Showing Question'}
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-[#54626f]/20 text-sm sm:text-base font-bold text-[#1f3b4d] hover:bg-[#f8fafb] shadow-2xs transition cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 text-[#6b4c35]"/>
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={handleFlip}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#e2eaeb] border border-[#54626f]/20 text-sm sm:text-base font-extrabold text-[#1f3b4d] hover:bg-[#d2dee0] transition cursor-pointer"
        >
          <RotateCw className="w-4 h-4 text-[#6b4c35]"/>
          <span>{isFlipped ? 'Show Question' : 'Flip Card'}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#54626f] text-sm sm:text-base font-bold text-white hover:bg-[#1F2118] shadow-sm transition cursor-pointer"
        >
          <span>Next Card</span>
          <ChevronRight className="w-4 h-4"/>
        </button>
      </div>
    </div>
  );
}