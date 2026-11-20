import React from 'react';
import { TrendingUp } from 'lucide-react';

const getScorePct = (item) => {
  if (typeof item?.percentage === 'number' && !Number.isNaN(item.percentage)) {
    return Math.min(100, Math.max(0, Math.round(item.percentage)));
  }
  if (
    typeof item?.score === 'number' &&
    !Number.isNaN(item.score) &&
    item.totalQuestions == null
  ) {
    return Math.min(100, Math.max(0, Math.round(item.score)));
  }
  const totalQ = Number(item?.totalQuestions) || 0;
  const scoreVal = Number(item?.score) || 0;
  return totalQ > 0
    ? Math.min(100, Math.max(0, Math.round((scoreVal / totalQ) * 100)))
    : 0;
};

export default function QuizResultTrendGraph({
  submissions = [],
  currentScore = null,
  isDark = false,
}) {
  const ordered = Array.isArray(submissions) ? [...submissions].reverse() : [];

  const pointsData = ordered.slice(-8).map((entry, idx) => ({
    id: entry?._id || entry?.submissionId || entry?.id || `pt-${idx}`,
    label: idx === 0 ? 'Quiz 1' : `Q${idx + 1}`,
    pct: getScorePct(entry),
  }));

  if (
    pointsData.length === 0 &&
    typeof currentScore === 'number' &&
    !Number.isNaN(currentScore)
  ) {
    pointsData.push({
      id: 'current-attempt',
      label: 'Quiz 1',
      pct: Math.min(100, Math.max(0, Math.round(currentScore))),
    });
  }

  const avg =
    pointsData.length > 0
      ? Math.round(
          pointsData.reduce((sum, p) => sum + p.pct, 0) / pointsData.length
        )
      : 0;

  const best =
    pointsData.length > 0 ? Math.max(...pointsData.map((p) => p.pct)) : 0;

  const delta =
    pointsData.length >= 2
      ? pointsData[pointsData.length - 1].pct -
        pointsData[pointsData.length - 2].pct
      : null;

  const svgWidth = 640;
  const svgHeight = 165;
  const padLeft = 44;
  const padRight = 24;
  const padTop = 22;
  const padBottom = 26;
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
      className={`rounded-3xl border px-6 py-5 shadow-2xs ${
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
                : 'bg-[#e2eaeb] text-[#2F5D68]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black leading-tight">
              Quiz Score Trend
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

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          {delta !== null && (
            <span
              className={`px-3 py-1 rounded-full ${
                delta >= 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-rose-100 text-rose-600'
              }`}
            >
              {delta >= 0 ? `↗ +${delta}% vs last` : `↘ ${delta}% vs last`}
            </span>
          )}
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
          Complete a quiz to see your score trend graph.
        </p>
      ) : (
        <div className="mt-3 w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full min-w-[440px] h-36"
          >
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = padTop + plotH - (tick / 100) * plotH;
              return (
                <g key={tick}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke={isDark ? '#2C313C' : '#DCE4E7'}
                    strokeDasharray="4 4"
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
                  isDark
                    ? 'rgba(47, 93, 104, 0.28)'
                    : 'rgba(47, 93, 104, 0.14)'
                }
              />
            )}

            {coords.length > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke={isDark ? '#5E9CA8' : '#2F5D68'}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {coords.map((pt) => (
              <g key={pt.id}>
                <text
                  x={pt.x}
                  y={pt.y - 8}
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
                  r="4.2"
                  fill={isDark ? '#5E9CA8' : '#2F5D68'}
                  stroke={isDark ? '#171A21' : '#FFFFFF'}
                  strokeWidth="1.5"
                />
                <text
                  x={pt.x}
                  y={svgHeight - 5}
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
}