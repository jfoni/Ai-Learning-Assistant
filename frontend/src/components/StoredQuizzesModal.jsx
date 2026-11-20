import React, { useState, useEffect } from 'react';
import {
  Trash2,
  X,
  Award,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Eye,
} from 'lucide-react';

const cleanDisplayTitle = (raw = '') => {
  const cleaned = String(raw)
    .replace(/\bpdf\b/gi, '')
    .replace(/\.(pdf|docx|doc|pptx|ppt|txt|csv|md)\b/gi, '')
    .replace(/\s*\(\d+\)\s*/g, ' ')
    .replace(/^\s*\d+(\.\d+)*[.):\-\s]+/, '')
    .replace(/[#*^$`~|\\{}[\]<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.replace(/\.+$/, '').trim() || 'Study Quiz';
};

const getItemId = (item, idx = 0) =>
  item?._id || item?.submissionId || item?.id || `sub-${idx}`;

const getItemPercentage = (item) => {
  if (typeof item?.percentage === 'number' && !Number.isNaN(item.percentage)) {
    return item.percentage;
  }
  const totalQ = Number(item?.totalQuestions) || 0;
  const scoreVal = Number(item?.score) || 0;
  return totalQ > 0 ? Math.round((scoreVal / totalQ) * 100) : 0;
};

const extractQuestionBreakdown = (item) => {
  if (!item) return [];

  const questions = Array.isArray(item.questions) ? item.questions : [];
  const answersArr = Array.isArray(item.answers) ? item.answers : [];
  const resultsArr = Array.isArray(item.results) ? item.results : [];
  const selectedMap =
    item.selectedAnswers && typeof item.selectedAnswers === 'object'
      ? item.selectedAnswers
      : {};

  const maxLen = Math.max(
    questions.length,
    answersArr.length,
    resultsArr.length,
    Object.keys(selectedMap).length
  );

  if (maxLen === 0) return [];

  return Array.from({ length: maxLen }, (_, idx) => {
    const qObj = questions[idx] || {};
    const ansObj =
      answersArr.find((a) => Number(a?.questionIndex) === idx) ||
      answersArr[idx] ||
      {};
    const resObj =
      resultsArr.find((r) => Number(r?.questionIndex) === idx) ||
      resultsArr[idx] ||
      {};

    const questionText =
      qObj.question ||
      qObj.prompt ||
      ansObj.question ||
      resObj.question ||
      `Question ${idx + 1}`;

    const userAnswer =
      selectedMap[idx] ??
      ansObj.selectedAnswer ??
      resObj.selectedAnswer ??
      'Not answered';

    const correctAnswer =
      qObj.correctAnswer ||
      ansObj.correctAnswer ||
      resObj.correctAnswer ||
      '';

    const isCorrect =
      typeof ansObj.isCorrect === 'boolean'
        ? ansObj.isCorrect
        : typeof resObj.isCorrect === 'boolean'
        ? resObj.isCorrect
        : String(userAnswer).trim() !== '' &&
          String(userAnswer).trim() === String(correctAnswer).trim();

    const explanation =
      qObj.explanation || ansObj.explanation || resObj.explanation || '';

    return {
      index: idx + 1,
      questionText,
      userAnswer: String(userAnswer || 'Not answered'),
      correctAnswer: String(correctAnswer || 'N/A'),
      isCorrect,
      explanation: String(explanation || ''),
    };
  });
};

const StoredQuizzesModal = ({ isOpen, onClose, items = [], onDelete }) => {
  const [selectedItemId, setSelectedItemId] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedItemId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedItem =
    items.find((it, idx) => String(getItemId(it, idx)) === String(selectedItemId)) ||
    null;

  const breakdown = selectedItem ? extractQuestionBreakdown(selectedItem) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            {selectedItem ? (
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4"/>
                Back
              </button>
            ) : (
              <Award className="h-5 w-5 text-emerald-600"/>
            )}

            <h3 className="text-lg font-bold text-slate-800">
              {selectedItem
                ? cleanDisplayTitle(
                    selectedItem.topic || selectedItem.title || 'Quiz Details'
                  )
                : `Stored Quiz Results (${items.length})`}
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="h-5 w-5"/>
          </button>
        </div>

        <div className="mt-4 max-h-[68vh] space-y-3 overflow-y-auto pr-1">
          {selectedItem ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm">
                <span>
                  Level: <strong>{selectedItem.difficulty || 'Medium'}</strong> • Score:{' '}
                  <strong>
                    {Number(selectedItem.score) || 0}/
                    {Number(selectedItem.totalQuestions) || breakdown.length}
                  </strong>
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 font-bold text-emerald-700">
                  {getItemPercentage(selectedItem)}%
                </span>
              </div>

              {breakdown.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">
                    Question details were not saved for this older quiz attempt.
                  </p>
                  <p className="mt-1">
                    Score: {Number(selectedItem.score) || 0}/
                    {Number(selectedItem.totalQuestions) || 0} (
                    {getItemPercentage(selectedItem)}%). Complete a new quiz to see
                    every question and your answers here.
                  </p>
                </div>
              ) : (
                breakdown.map((q) => (
                  <div
                    key={q.index}
                    className={`rounded-xl border p-4 space-y-2 ${
                      q.isCorrect
                        ? 'border-emerald-200 bg-emerald-50/40'
                        : 'border-rose-200 bg-rose-50/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold text-slate-900 leading-snug">
                        {q.index}. {q.questionText}
                      </p>
                      {q.isCorrect ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5"/>
                          Correct
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                          <XCircle className="h-3.5 w-3.5"/>
                          Wrong
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-700">
                      <span className="font-semibold">Your Answer:</span>{' '}
                      <span
                        className={
                          q.isCorrect
                            ? 'font-semibold text-emerald-700'
                            : 'font-semibold text-rose-700'
                        }
                      >
                        {q.userAnswer}
                      </span>
                    </p>

                    {!q.isCorrect && q.correctAnswer && (
                      <p className="text-sm text-slate-700">
                        <span className="font-semibold">Correct Answer:</span>{' '}
                        <span className="font-semibold text-emerald-700">
                          {q.correctAnswer}
                        </span>
                      </p>
                    )}

                    {q.explanation && (
                      <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/70">
                        <span className="font-semibold">Explanation:</span>{' '}
                        {q.explanation}
                      </p>
                    )}
                  </div>
                ))
              )}
            </>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No stored quiz results found yet.
            </p>
          ) : (
            items.map((item, idx) => {
              const id = getItemId(item, idx);
              const title = cleanDisplayTitle(
                item.topic || item.title || 'Study Quiz'
              );
              const totalQ = Number(item.totalQuestions) || 0;
              const scoreVal = Number(item.score) || 0;
              const pct = getItemPercentage(item);

              return (
                <div
                  key={id}
                  onClick={() => setSelectedItemId(id)}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-4 py-3 transition hover:border-slate-300 hover:bg-slate-100/80 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-800">
                        {title}
                      </p>
                      <Eye className="h-4 w-4 shrink-0 text-slate-400"/>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.difficulty || 'Medium'} • Score: {scoreVal}/{totalQ} •
                      Click to view questions &amp; answers
                    </p>
                  </div>

                  <div
                    className="flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                      {pct}%
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (String(selectedItemId) === String(id)) {
                          setSelectedItemId(null);
                        }
                        onDelete(id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5"/>
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StoredQuizzesModal;