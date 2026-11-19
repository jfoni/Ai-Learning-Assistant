import React from 'react';
import { useTheme } from '../context/ThemeContext';

// Strip raw LaTeX dollar signs without altering user content
export const cleanDisplayText = (text) =>
  String(text || '')
    .replace(/\$([^$]+)\$/g, '$1')
    .trim();

// Highlight bold, italic, and key study words with distinct colors while keeping uniform size
export const renderFormattedInline = (text, isDark = false) => {
  if (!text) return null;
  const sanitized = cleanDisplayText(text);
  const tokens = sanitized.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);

  const isImportantWord = (str) =>
    /\b(important|key|note|remember|exam|crucial|main|example|tip|optimal)\b/i.test(str);

  return tokens.map((token, idx) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong
          key={idx}
          className={`font-extrabold px-2 py-0.5 rounded-md ${
            isDark
              ? 'text-[#E8ECEF] bg-[#2B3744]'
              : 'text-[#1f3b4d] bg-[#d9ecee]'
          }`}
        >
          {token.slice(2, -2)}
        </strong>
      );
    }

    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em
          key={idx}
          className={`italic font-bold ${
            isDark ? 'text-[#E5B880]' : 'text-[#9a5b13]'
          }`}
        >
          {token.slice(1, -1)}
        </em>
      );
    }

    if (isImportantWord(token)) {
      return (
        <span
          key={idx}
          className={`font-extrabold ${
            isDark ? 'text-[#7EC4CF]' : 'text-[#2b6777]'
          }`}
        >
          {token}
        </span>
      );
    }

    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
};

// Larger, summary-styled ul list for chat responses with distinct word and line highlights
export function StyledChatUl({ items = [] }) {
  const { isDark } = useTheme();
  if (!Array.isArray(items) || items.length === 0) return null;

  const containerClass = isDark
    ? 'my-4 space-y-3 rounded-2xl bg-[#181D23] border border-[#303A46] border-l-4 border-l-[#7EC4CF] p-4 sm:p-5 list-none m-0'
    : 'my-4 space-y-3 rounded-2xl bg-[#fbf8f5] border border-[#2b6777]/25 border-l-4 border-l-[#2b6777] p-4 sm:p-5 list-none m-0';

  return (
    <ul className={containerClass}>
      {items.map((itemText, idx) => {
        const isImportantLine =
          /\b(important|key|note|remember|exam|crucial|main|tip|optimal)\b/i.test(itemText);
        const isExampleLine = /\b(example|e\.g\.|for instance|imagine)\b/i.test(itemText);

        const rowStyle = isDark
          ? isImportantLine
            ? 'bg-[#22313A] text-[#E6F4F7] font-bold border border-[#456775]'
            : isExampleLine
              ? 'bg-[#2D2419] text-[#F5DEC0] font-bold border border-[#7A5934]'
              : 'bg-[#1E242B] text-[#E8ECEF] font-bold border border-[#303A46]'
          : isImportantLine
            ? 'bg-[#e6f2f4] text-[#1f3b4d] font-semibold border border-[#2b6777]/20'
            : isExampleLine
              ? 'bg-[#fdf3e7] text-[#5c3a14] font-medium border border-[#d99b52]/25'
              : 'bg-white/90 text-[#1F2118] border border-[#54626f]/10';

        const dotStyle = isImportantLine
          ? isDark
            ? 'bg-[#7EC4CF]'
            : 'bg-[#2b6777]'
          : isExampleLine
            ? 'bg-[#c87d28]'
            : isDark
              ? 'bg-[#C5B4E3]'
              : 'bg-[#6b4c35]';

        return (
          <li
            key={idx}
            className={`flex items-start gap-3 text-lg sm:text-xl leading-relaxed rounded-xl px-3.5 py-2.5 ${rowStyle}`}
          >
            <span className={`mt-2.5 w-2.5 h-2.5 rounded-full shrink-0 ${dotStyle}`} />
            <span className="flex-1">{renderFormattedInline(itemText, isDark)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default StyledChatUl;