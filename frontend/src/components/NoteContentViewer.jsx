import React from 'react';

const cleanText = (str = '') =>
  String(str || '')
    .replace(/```[a-zA-Z]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\"/g, '"')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const hasMeaningfulText = (str = '') => cleanText(str).length > 0;

// Splits long text into short blocks (~2 lines max per block)
const splitShortBlocks = (rawText = '', maxChars = 125) => {
  const cleaned = cleanText(rawText);
  if (!cleaned) return [];

  const paragraphs = cleaned
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const blocks = [];

  for (const para of paragraphs) {
    if (para.length <= maxChars) {
      blocks.push(para);
      continue;
    }

    const parts = para.match(/[^.!?]+[.!?]*\s*|[^,;]+[,;]\s*|\S+\s*/g) || [
      para,
    ];
    let current = '';

    for (const rawPart of parts) {
      const piece = rawPart.trim();
      if (!piece) continue;

      if (piece.length > maxChars) {
        if (current) {
          blocks.push(current.trim());
          current = '';
        }
        const words = piece.split(/\s+/);
        let line = '';
        for (const w of words) {
          if ((line + ' ' + w).trim().length <= maxChars) {
            line = line ? `${line} ${w}` : w;
          } else {
            if (line) blocks.push(line.trim());
            line = w;
          }
        }
        if (line) current = line;
        continue;
      }

      const candidate = current ? `${current} ${piece}` : piece;
      if (candidate.length <= maxChars) {
        current = candidate;
      } else {
        if (current) blocks.push(current.trim());
        current = piece;
      }
    }

    if (current) blocks.push(current.trim());
  }

  return blocks;
};

const NiceBulletList = ({ items = [], ordered = false }) => {
  const validItems = Array.isArray(items)
    ? items.filter(hasMeaningfulText)
    : [];
  if (validItems.length === 0) return null;

  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <ListTag
      style={{ fontSize: '19px', fontWeight: 600 }}
      className={`${
        ordered ? 'list-decimal pl-6' : 'list-none pl-0'
      } space-y-3 text-lg font-semibold leading-relaxed text-stone-900`}
    >
      {validItems.map((item, idx) => (
        <li
          key={idx}
          style={{ fontSize: '19px', fontWeight: 600 }}
          className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 border border-stone-300/80 shadow-2xs"
        >
          {!ordered && (
            <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-stone-900" />
          )}
          <span className="flex-1 leading-relaxed">{cleanText(item)}</span>
        </li>
      ))}
    </ListTag>
  );
};

export default function NoteContentViewer({ note }) {
  if (!note) return null;

  const sections = Array.isArray(note.sections) ? note.sections : [];

  return (
    <div
      style={{ fontSize: '19px', fontWeight: 600 }}
      className="space-y-7 rounded-2xl border border-stone-300/80 bg-[#FAF8F5] p-5 sm:p-8 text-lg font-semibold leading-relaxed text-stone-900"
    >
      {/* Header */}
      <div className="border-b border-stone-300 pb-5">
        <h2
          style={{ fontSize: '28px', fontWeight: 800 }}
          className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-950"
        >
          {cleanText(note.title || 'Study Notes')}
        </h2>
        {hasMeaningfulText(note.subject) && (
          <p
            style={{ fontSize: '19px', fontWeight: 700 }}
            className="mt-2 text-lg font-bold text-stone-700"
          >
            Subject: {cleanText(note.subject)}
          </p>
        )}
      </div>

      {/* Sections */}
      {sections.length > 0 ? (
        <div className="space-y-7">
          {sections.map((sec, index) => {
            const heading = cleanText(sec.heading || `Topic ${index + 1}`);
            const definitionBlocks = splitShortBlocks(sec.definition, 125);
            const explanationBlocks = splitShortBlocks(sec.explanation, 125);
            const principleBlocks = splitShortBlocks(sec.workingPrinciple, 125);
            const extraNoteBlocks = splitShortBlocks(
              sec.aiSupplementaryNote,
              125
            );

            const bulletPoints = Array.isArray(sec.bulletPoints)
              ? sec.bulletPoints.filter(hasMeaningfulText)
              : [];
            const steps = Array.isArray(sec.steps)
              ? sec.steps.filter(hasMeaningfulText)
              : [];
            const types = Array.isArray(sec.typesOrClassifications)
              ? sec.typesOrClassifications.filter(hasMeaningfulText)
              : [];
            const comparisons = Array.isArray(sec.comparisons)
              ? sec.comparisons.filter(hasMeaningfulText)
              : [];
            const formulas = Array.isArray(sec.formulas)
              ? sec.formulas.filter(hasMeaningfulText)
              : [];
            const examples = Array.isArray(sec.examples)
              ? sec.examples.filter(hasMeaningfulText)
              : [];

            return (
              <section
                key={sec._id || index}
                className="rounded-2xl border border-stone-300/80 bg-[#F4F1EC] p-5 sm:p-7 space-y-5"
              >
                <h3
                  style={{ fontSize: '23px', fontWeight: 800 }}
                  className="text-xl sm:text-2xl font-extrabold text-stone-950"
                >
                  {sec.topicNumber || index + 1}. {heading}
                </h3>

                {definitionBlocks.length > 0 && (
                  <div className="rounded-xl bg-white p-4 border border-stone-300/80 space-y-2">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-stone-900"
                    >
                      Definition
                    </p>
                    {definitionBlocks.map((blk, i) => (
                      <React.Fragment key={i}>
                        <p
                          style={{ fontSize: '19px', fontWeight: 700 }}
                          className="text-lg font-bold leading-relaxed text-stone-900"
                        >
                          {blk}
                        </p>
                        {i < definitionBlocks.length - 1 && (
                          <div className="h-1.5" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {explanationBlocks.length > 0 && (
                  <div className="space-y-2">
                    {explanationBlocks.map((blk, i) => (
                      <React.Fragment key={i}>
                        <p
                          style={{ fontSize: '19px', fontWeight: 600 }}
                          className="text-lg font-semibold leading-relaxed text-stone-900"
                        >
                          {blk}
                        </p>
                        {i < explanationBlocks.length - 1 && (
                          <div className="h-2" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {principleBlocks.length > 0 && (
                  <div className="rounded-xl bg-white p-4 border border-stone-300/80 space-y-2">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-stone-900"
                    >
                      Working Principle
                    </p>
                    {principleBlocks.map((blk, i) => (
                      <React.Fragment key={i}>
                        <p
                          style={{ fontSize: '19px', fontWeight: 600 }}
                          className="text-lg font-semibold leading-relaxed text-stone-900"
                        >
                          {blk}
                        </p>
                        {i < principleBlocks.length - 1 && (
                          <div className="h-1.5" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}

                {bulletPoints.length > 0 && (
                  <div className="space-y-2.5">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-stone-900"
                    >
                      Key Points
                    </p>
                    <NiceBulletList items={bulletPoints} />
                  </div>
                )}

                {steps.length > 0 && (
                  <div className="space-y-2.5">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-stone-900"
                    >
                      Steps
                    </p>
                    <NiceBulletList items={steps} ordered />
                  </div>
                )}

                {types.length > 0 && (
                  <div className="space-y-2.5">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-stone-900"
                    >
                      Types & Classifications
                    </p>
                    <NiceBulletList items={types} />
                  </div>
                )}

                {comparisons.length > 0 && (
                  <div className="space-y-2.5">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-stone-900"
                    >
                      Comparisons
                    </p>
                    <NiceBulletList items={comparisons} />
                  </div>
                )}

                {formulas.length > 0 && (
                  <div className="rounded-xl bg-slate-100 border border-slate-300 p-4 space-y-2">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-slate-900"
                    >
                      Formulas & Complexity
                    </p>
                    <ul
                      style={{ fontSize: '19px', fontWeight: 700 }}
                      className="list-disc pl-6 space-y-2 text-lg font-bold text-slate-900"
                    >
                      {formulas.map((f, i) => (
                        <li key={i}>{cleanText(f)}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Different Warm Amber Color for Examples */}
                {examples.length > 0 && (
                  <div className="rounded-xl bg-amber-100/90 border-2 border-amber-300 p-4 sm:p-5 space-y-3">
                    <p
                      style={{ fontSize: '16px', fontWeight: 800 }}
                      className="text-base font-extrabold uppercase tracking-wide text-amber-950"
                    >
                      Examples
                    </p>
                    <ul className="space-y-2.5">
                      {examples.map((ex, i) => (
                        <li
                          key={i}
                          style={{ fontSize: '19px', fontWeight: 700 }}
                          className="flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 border border-amber-300 text-lg font-bold text-amber-950"
                        >
                          <span className="mt-2 h-3 w-3 shrink-0 rounded-full bg-amber-700" />
                          <span className="leading-relaxed">
                            {cleanText(ex)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {hasMeaningfulText(sec.codeSnippet) && (
                  <pre
                    style={{ fontSize: '16px', fontWeight: 600 }}
                    className="overflow-x-auto rounded-xl bg-stone-900 p-4 text-base font-semibold leading-relaxed text-stone-100"
                  >
                    <code>{cleanText(sec.codeSnippet)}</code>
                  </pre>
                )}

                {extraNoteBlocks.length > 0 && (
                  <div className="border-l-4 border-stone-700 bg-white rounded-r-xl p-4 space-y-2">
                    <p
                      style={{ fontSize: '15px', fontWeight: 800 }}
                      className="text-sm font-extrabold uppercase tracking-wide text-stone-800"
                    >
                      Additional Note
                    </p>
                    {extraNoteBlocks.map((blk, i) => (
                      <React.Fragment key={i}>
                        <p
                          style={{ fontSize: '18px', fontWeight: 600 }}
                          className="text-lg font-semibold leading-relaxed text-stone-800"
                        >
                          {blk}
                        </p>
                        {i < extraNoteBlocks.length - 1 && (
                          <div className="h-1.5" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {splitShortBlocks(note.contentText || '', 125).map((blk, i) => (
            <React.Fragment key={i}>
              <p
                style={{ fontSize: '19px', fontWeight: 600 }}
                className="text-lg font-semibold leading-relaxed text-stone-900"
              >
                {blk}
              </p>
              {i < splitShortBlocks(note.contentText || '', 125).length - 1 && (
                <div className="h-2" />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Important Points to Remember */}
      {Array.isArray(note.importantPoints) &&
        note.importantPoints.filter(hasMeaningfulText).length > 0 && (
          <div className="rounded-2xl border border-stone-300 bg-[#F4F1EC] p-5 sm:p-7 space-y-3">
            <h3
              style={{ fontSize: '22px', fontWeight: 800 }}
              className="text-xl sm:text-2xl font-extrabold text-stone-950"
            >
              Important Points to Remember
            </h3>
            <NiceBulletList
              items={note.importantPoints.filter(hasMeaningfulText)}
            />
          </div>
        )}
    </div>
  );
}