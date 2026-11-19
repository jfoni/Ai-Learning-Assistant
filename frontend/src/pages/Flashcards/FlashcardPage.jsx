import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

// Format bold text segments cleanly
const formatCardText = (text, isAnswer = false, isDark = false) => {
  if (!text) return null;
  const cleaned = String(text).replace(/\$([^$]+)\$/g, '$1');
  const parts = cleaned.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((chunk, i) => {
    if (chunk.startsWith('**') && chunk.endsWith('**') && chunk.length > 4) {
      return (
        <strong
          key={i}
          className={
            isDark
              ? isAnswer
                ? 'font-black text-[#E8ECEF] bg-[#2B3744] px-2 py-0.5 rounded-md'
                : 'font-black text-[#E5B880] bg-[#222732] px-2 py-0.5 rounded-md'
              : isAnswer
                ? 'font-black text-[#1f3b4d] bg-[#e2eaeb] px-2 py-0.5 rounded-md'
                : 'font-black text-[#6b4c35] bg-[#6b4c35]/10 px-2 py-0.5 rounded-md'
          }
        >
          {chunk.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{chunk}</React.Fragment>;
  });
};

// Render question or answer text with bullet list support
const renderFlashcardContent = (text, isAnswer = false, isDark = false) => {
  if (!text) return null;

  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const blocks = [];
  let bullets = [];

  const flushBullets = (keyPrefix) => {
    if (bullets.length > 0) {
      blocks.push(
        <ul
          key={`${keyPrefix}-ul`}
          className={`my-3.5 space-y-2.5 rounded-2xl border p-4 list-none m-0 ${
            isDark
              ? 'bg-[#12141A] border-[#2E3542]'
              : 'bg-[#eef4f5] border-[#1f3b4d]/15'
          }`}
        >
          {bullets.map((item, idx) => (
            <li
              key={idx}
              className={`flex items-start gap-3 leading-relaxed ${
                isDark
                  ? 'font-black text-[#E8ECEF]'
                  : 'font-medium text-[#1f3b4d]'
              }`}
              style={{ fontSize: '19px' }}
            >
              <span
                className={`mt-2.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                  isDark ? 'bg-[#7EC4CF]' : 'bg-[#6b4c35]'
                }`}
              />
              <span className="flex-1">
                {formatCardText(item, true, isDark)}
              </span>
            </li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1]);
      return;
    }

    flushBullets(`line-${idx}`);
    blocks.push(
      <p
        key={`p-${idx}`}
        className={
          isDark
            ? isAnswer
              ? 'font-black text-[#F3F4F6] leading-relaxed my-2'
              : 'font-black text-[#F3F4F6] leading-snug my-1'
            : isAnswer
              ? 'font-semibold text-[#1F2118] leading-relaxed my-2'
              : 'font-black text-[#1F2118] leading-snug my-1'
        }
        style={{ fontSize: isAnswer ? '20px' : '23px' }}
      >
        {formatCardText(line, isAnswer, isDark)}
      </p>
    );
  });

  flushBullets('end');

  return <div className="space-y-1">{blocks}</div>;
};

export default function FlashcardPage({ flashcards = [], onBack }) {
  const { isDark } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [flashcards]);

  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    return (
      <div
        className={`rounded-2xl p-8 text-center shadow-sm mt-4 border ${
          isDark
            ? 'bg-[#171A21] border-[#2C313C] text-[#F3F4F6]'
            : 'bg-white/95 border-[#54626f]/20 text-[#1F2118]'
        }`}
      >
        <p
          className={`mb-4 ${
            isDark ? 'font-black text-[#F3F4F6]' : 'font-bold text-[#1F2118]'
          }`}
          style={{ fontSize: '18px' }}
        >
          No flashcards available in this deck.
        </p>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white bg-[#54626f] hover:bg-[#1F2118] transition cursor-pointer"
            style={{ fontSize: '16px' }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Flashcards</span>
          </button>
        )}
      </div>
    );
  }

  const safeIndex = Math.min(currentIndex, flashcards.length - 1);
  const card = flashcards[safeIndex] || {};
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
      {/* Top Bar: Back Button and Card Counter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'bg-[#171A21] border-[#2C313C] text-[#F3F4F6] hover:bg-[#222732] font-black'
                : 'bg-white border-[#54626f]/20 text-[#1f3b4d] hover:bg-[#f8fafb] shadow-2xs font-bold'
            }`}
            style={{ fontSize: '16px' }}
          >
            <ArrowLeft
              className={`w-4 h-4 ${isDark ? 'text-[#7EC4CF]' : 'text-[#6b4c35]'}`}
            />
            <span>Back to Decks</span>
          </button>
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          <span
            className={`px-3.5 py-1.5 rounded-full border font-extrabold ${
              isDark
                ? 'bg-[#171A21] border-[#2E3542] text-[#F3F4F6] font-black'
                : 'bg-white border-[#54626f]/20 text-[#1f3b4d] shadow-2xs'
            }`}
            style={{ fontSize: '16px' }}
          >
            Card {Number(safeIndex + 1)} of {totalCards}
          </span>
          <span
            className={`px-3.5 py-1.5 rounded-full font-extrabold ${
              isDark
                ? 'bg-[#222732] text-[#E5B880] border border-[#2E3542] font-black'
                : 'bg-[#6b4c35]/12 text-[#6b4c35]'
            }`}
            style={{ fontSize: '16px' }}
          >
            {cardDifficulty}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className={`w-full h-2.5 rounded-full border overflow-hidden ${
          isDark
            ? 'bg-[#12141A] border-[#2E3542]'
            : 'bg-white/80 border-[#54626f]/15'
        }`}
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isDark ? 'bg-[#7EC4CF]' : 'bg-[#54626f]'
          }`}
          style={{ width: `${Math.round(((safeIndex + 1) / totalCards) * 100)}%` }}
        />
      </div>

      {/* Main Flashcard Surface */}
      <div
        onClick={handleFlip}
        className={`rounded-3xl p-7 sm:p-10 min-h-[300px] sm:min-h-[340px] flex flex-col justify-between shadow-md border transition cursor-pointer select-none ${
          isDark
            ? isFlipped
              ? 'bg-[#171A21] border-[#7EC4CF]/40'
              : 'bg-[#171A21] border-[#2C313C] hover:border-[#2E3542]'
            : isFlipped
              ? 'bg-white border-[#54626f]/30'
              : 'bg-white/95 border-[#54626f]/20 hover:border-[#54626f]/40'
        }`}
      >
        {/* Card Side Label */}
        <div
          className={`flex items-center justify-between gap-2 border-b pb-4 ${
            isDark ? 'border-[#2C313C]' : 'border-[#54626f]/12'
          }`}
        >
          {!isFlipped ? (
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider ${
                isDark
                  ? 'bg-[#222732] text-[#E8ECEF]'
                  : 'bg-[#e2eaeb] text-[#1f3b4d]'
              }`}
              style={{ fontSize: '15px' }}
            >
              <HelpCircle
                className={`w-4 h-4 ${isDark ? 'text-[#7EC4CF]' : 'text-[#6b4c35]'}`}
              />
              <span>Question</span>
            </span>
          ) : (
            <span
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-black uppercase tracking-wider ${
                isDark
                  ? 'bg-[#22313A] text-[#7EC4CF]'
                  : 'bg-[#6b4c35]/12 text-[#6b4c35]'
              }`}
              style={{ fontSize: '15px' }}
            >
              <CheckCircle2
                className={`w-4 h-4 ${isDark ? 'text-[#7EC4CF]' : 'text-[#6b4c35]'}`}
              />
              <span>Answer</span>
            </span>
          )}

          <span
            className={`inline-flex items-center gap-1.5 ${
              isDark ? 'font-bold text-[#D1D5DB]' : 'font-bold text-[#54626f]'
            }`}
            style={{ fontSize: '16px' }}
          >
            <RotateCw
              className={`w-4 h-4 ${isDark ? 'text-[#7EC4CF]' : 'text-[#6b4c35]'}`}
            />
            <span>Click card to {isFlipped ? 'see question' : 'reveal answer'}</span>
          </span>
        </div>

        {/* Question or Answer Main Body */}
        <div className="my-auto py-6">
          {!isFlipped ? (
            renderFlashcardContent(card.question, false, isDark)
          ) : (
            <div
              className={`rounded-2xl border-l-4 p-5 sm:p-6 ${
                isDark
                  ? 'bg-[#12141A] border-[#7EC4CF]'
                  : 'bg-[#f8fafb] border-[#6b4c35]'
              }`}
            >
              {renderFlashcardContent(card.answer, true, isDark)}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div
          className={`pt-3 border-t flex items-center justify-between ${
            isDark
              ? 'border-[#2C313C] font-bold text-[#D1D5DB]'
              : 'border-[#54626f]/10 font-semibold text-[#54626f]/80'
          }`}
          style={{ fontSize: '16px' }}
        >
          <span>Easy-to-follow exam prep</span>
          <span className={isDark ? 'text-[#F3F4F6] font-black' : 'text-[#1f3b4d] font-bold'}>
            {isFlipped ? 'Showing Answer' : 'Showing Question'}
          </span>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <button
          type="button"
          onClick={handlePrev}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl border transition cursor-pointer ${
            isDark
              ? 'bg-[#171A21] border-[#2C313C] text-[#F3F4F6] hover:bg-[#222732] font-black'
              : 'bg-white border-[#54626f]/20 text-[#1f3b4d] hover:bg-[#f8fafb] shadow-2xs font-bold'
          }`}
          style={{ fontSize: '17px' }}
        >
          <ChevronLeft
            className={`w-4 h-4 ${isDark ? 'text-[#7EC4CF]' : 'text-[#6b4c35]'}`}
          />
          <span>Previous</span>
        </button>

        <button
          type="button"
          onClick={handleFlip}
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl border transition cursor-pointer ${
            isDark
              ? 'bg-[#222732] border-[#2E3542] text-[#F3F4F6] hover:bg-[#2C3240] font-black'
              : 'bg-[#e2eaeb] border-[#54626f]/20 text-[#1f3b4d] hover:bg-[#d2dee0] font-extrabold'
          }`}
          style={{ fontSize: '17px' }}
        >
          <RotateCw
            className={`w-4 h-4 ${isDark ? 'text-[#7EC4CF]' : 'text-[#6b4c35]'}`}
          />
          <span>{isFlipped ? 'Show Question' : 'Flip Card'}</span>
        </button>

        <button
          type="button"
          onClick={handleNext}
          className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white bg-[#54626f] hover:bg-[#1F2118] transition cursor-pointer ${
            isDark ? 'font-black shadow-sm' : 'font-bold shadow-sm'
          }`}
          style={{ fontSize: '17px' }}
        >
          <span>Next Card</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}