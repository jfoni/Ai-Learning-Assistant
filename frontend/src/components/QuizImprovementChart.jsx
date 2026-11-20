import React from 'react';
import { TrendingUp } from 'lucide-react';

const getPercentage = (sub) => {
  if (typeof sub?.percentage === 'number' && !Number.isNaN(sub.percentage)) {
    return Math.min(100, Math.max(0, sub.percentage));
  }
  const totalQ = Number(sub?.totalQuestions) || 0;
  const scoreVal = Number(sub?.score) || 0;
  return totalQ > 0
    ? Math.min(100, Math.max(0, Math.round((scoreVal / totalQ) * 100)))
    : 0;
};

const QuizImprovementChart = ({ submissions = [], isDark = false }) => {
  const ordered = [...submissions].reverse();

  const pointsData = ordered.map((sub, idx) => ({
    id: sub._id || sub.submissionId || sub.id || `pt-${idx}`,
    label: `Q${idx + 1}`,
    pct: getPercentage(sub),
  }));

  const avg =
    pointsData.length > 0
      ? Math.round(
          pointsData.reduce((sum, p) => sum + p.pct, 0) / pointsData.length
        )
      : 0;

  const best =
    pointsData.length > 0
      ? Math.max(...pointsData.map((p) => p.pct))
      : 0;

  const svgWidth = 560;
  const svgHeight = 115;
  const padLeft = 36;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 22;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const coords = pointsData.map((pt, idx) => {
    const x =
      pointsData.length === 1
        ? padLeft + plotW / 2
        : padLeft + (idx / (pointsData.length - 1)) * plotW;
    const y = padTop + plotH - (pt.pct / 100) * plotH;
    return { ...pt, x, y };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
    .join(' ');

  const areaPath =
    coords.length > 0
      ? `${linePath} L ${coords[coords.length - 1].x} ${
          padTop + plotH
        } L ${coords[0].x} ${padTop + plotH} Z`
      : '';

  return (
    <div
      className={`rounded-3xl border px-6 py-5 shadow-2xs mb-8 ${
        isDark
          ? 'bg-[#171A21] border-[#2C313C] text-[#F3F4F6]'
          : 'bg-white border-[#D5DDE0] text-[#111827]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isDark
                ? 'bg-[#222732] text-[#E5E7EB]'
                : 'bg-[#e2eaeb] text-[#54626f]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black leading-tight">
              Quiz Score Improvement
            </h3>
            <p
              className={`text-xs ${
                isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
              }`}
            >
              Progress across your stored quizzes ({pointsData.length})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <span
            className={`px-3 py-1 rounded-full ${
              isDark
                ? 'bg-[#222732] text-[#E5E7EB]'
                : 'bg-[#e2eaeb] text-[#374151]'
            }`}
          >
            Avg: {avg}%
          </span>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
            Best: {best}%
          </span>
        </div>
      </div>

      {coords.length === 0 ? (
        <p
          className={`pt-5 pb-2 text-center text-xs sm:text-sm ${
            isDark ? 'text-[#9CA3AF]' : 'text-[#6B7280]'
          }`}
        >
          Complete a quiz to see your score improvement graph.
        </p>
      ) : (
        <div className="mt-3 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-28"
          >
            {[0, 50, 100].map((tick) => {
              const y = padTop + plotH - (tick / 100) * plotH;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke={isDark ? '#2C313C' : '#E5E7EB'}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="9.5"
                    fill={isDark ? '#9CA3AF' : '#6B7280'}
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}

            {areaPath && (
              <path
                d={areaPath}
                fill={
                  isDark ? 'rgba(94, 156, 168, 0.16)' : 'rgba(84, 98, 111, 0.12)'
                }
              />
            )}

            {coords.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke={isDark ? '#5E9CA8' : '#54626f'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {coords.map((pt) => (
              <g key={pt.id}>
                <text
                  x={pt.x}
                  y={pt.y - 7}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="700"
                  fill={isDark ? '#F3F4F6' : '#111827'}
                >
                  {pt.pct}%
                </text>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4"
                  fill={isDark ? '#5E9CA8' : '#54626f'}
                  stroke={isDark ? '#171A21' : '#FFFFFF'}
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="600"
                  fill={isDark ? '#9CA3AF' : '#6B7280'}
                >
                  {pt.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
};

export default QuizImprovementChart;