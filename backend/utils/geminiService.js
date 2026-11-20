export const stripTopicNoise = (raw = '') => {
  const firstLine =
    String(raw || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) || '';

  const candidate = firstLine.length > 120 ? firstLine.slice(0, 80) : firstLine;

  const cleaned = candidate
    .replace(/topic:\s*/i, '')
    .replace(/\bpdf\b/gi, '')
    .replace(/\.(pdf|docx|doc|pptx|ppt|txt|csv|md)\b/gi, '')
    .replace(/\s*\(\d+\)\s*/g, ' ')
    .replace(/^\s*\d+(\.\d+)*[.):\-\s]+/, '')
    .replace(/[#*^$`~|\\{}[\]<>]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\s+\./g, '.')
    .trim();

  return cleaned.replace(/\.+$/, '').trim() || 'Core Study Topic';
};

export const sanitizeQuizText = (text = '') => {
  return String(text || '')
    .replace(/\bpdf\b/gi, '')
    .replace(/\.(pdf|docx|doc|pptx|ppt|txt|csv|md)\b/gi, '')
    .replace(/[#*^$`~|\\{}[\]<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const buildLevelSpecificQuestions = (topic, count, difficulty) => {
  const level = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';

  const banks = {
    Easy: [
      {
        q: `What is the main focus of ${topic}?`,
        opts: [
          `Understanding the core concepts and basic definitions in ${topic}`,
          `Replacing every algorithm with manual memory dumps`,
          `Disabling input validation across all functions`,
          `Running unrelated tasks with no goal state`,
        ],
        ansIndex: 0,
        exp: `${topic} centers on understanding its core concepts, terms, and basic mechanics.`,
      },
      {
        q: `Which statement best describes a basic idea behind ${topic}?`,
        opts: [
          `It uses clear rules or steps to move from an initial state toward a target`,
          `It picks random answers regardless of the input`,
          `It cannot be traced or explained step by step`,
          `It only works when no data is available`,
        ],
        ansIndex: 0,
        exp: `Clear rules and step-by-step state transitions are foundational to ${topic}.`,
      },
      {
        q: `When starting with ${topic}, what should you identify first?`,
        opts: [
          `Key terms, inputs, and expected outputs`,
          `Power supply voltage tolerances on a monitor`,
          `Browser favicon caching rules`,
          `Unrelated syntax from another subject`,
        ],
        ansIndex: 0,
        exp: `Identifying key terms, inputs, and expected outputs gives a clear starting point for ${topic}.`,
      },
      {
        q: `Why do students study ${topic} in problem solving?`,
        opts: [
          `To structure solutions logically and make informed choices`,
          `To make every problem take exponential time`,
          `To skip checking whether a solution is right`,
          `To work only on empty lists`,
        ],
        ansIndex: 0,
        exp: `Studying ${topic} helps organize solutions logically and improve decision-making.`,
      },
      {
        q: `What is an essential element when working with ${topic}?`,
        opts: [
          `A clear way to recognize a valid state or goal`,
          `An infinite loop with no exit condition`,
          `Constants that ignore all problem inputs`,
          `Silent failures that hide every step`,
        ],
        ansIndex: 0,
        exp: `Recognizing valid states and goal conditions is essential in ${topic}.`,
      },
    ],
    Medium: [
      {
        q: `How does ${topic} improve decisions compared to a blind or uninformed approach?`,
        opts: [
          `It uses relevant criteria or signals to prioritize stronger options earlier`,
          `It checks every choice blindly in reverse order`,
          `It ignores helpful information when choosing`,
          `It finishes in zero steps on every input`,
        ],
        ansIndex: 0,
        exp: `Using relevant criteria or signals helps ${topic} rank more promising choices ahead of weaker ones.`,
      },
      {
        q: `In ${topic}, what happens if the evaluation rule or guiding score is inaccurate?`,
        opts: [
          `It can favor suboptimal choices and reduce solution quality`,
          `It automatically fixes invalid external inputs`,
          `It reduces memory usage to zero every time`,
          `It makes every option have the exact same value`,
        ],
        ansIndex: 0,
        exp: `An inaccurate evaluation rule in ${topic} can mislead selection toward less optimal outcomes.`,
      },
      {
        q: `When applying ${topic} to a real task, what balance matters most?`,
        opts: [
          `Solution quality or accuracy against time and memory cost`,
          `Ignoring constraints to increase file size`,
          `Repeating identical work without reusing results`,
          `Removing stop conditions during execution`,
        ],
        ansIndex: 0,
        exp: `Balancing accuracy or solution quality against time and memory cost is key in ${topic}.`,
      },
      {
        q: `Which scenario best fits a practical use of ${topic}?`,
        opts: [
          `Selecting the most promising next step toward a target outcome`,
          `Deleting valid records to avoid sorting them`,
          `Running an endless loop until a timeout occurs`,
          `Turning numbers into random text strings`,
        ],
        ansIndex: 0,
        exp: `Picking the most promising step toward a goal is a core practical use of ${topic}.`,
      },
      {
        q: `What separates a reliable implementation of ${topic} from a weak one?`,
        opts: [
          `Accurate modeling of states, transitions, and goal checks`,
          `Guessing instead of using problem structure`,
          `Overlooking boundary and edge cases`,
          `Using fixed values unrelated to the problem`,
        ],
        ansIndex: 0,
        exp: `Accurate state modeling, valid transitions, and proper goal checks make ${topic} reliable.`,
      },
    ],
    Hard: [
      {
        q: `Under what condition can ${topic} miss an optimal solution even when one exists?`,
        opts: [
          `When cost estimates overestimate remaining effort or prune optimal paths early`,
          `When the goal state can be reached in a finite number of steps`,
          `When visited states are recorded consistently`,
          `When ties are broken in a fixed order`,
        ],
        ansIndex: 0,
        exp: `Overestimating remaining cost or pruning optimal branches early can prevent optimality in ${topic}.`,
      },
      {
        q: `On larger problem instances using ${topic}, what bottleneck most often grows quickly?`,
        opts: [
          `Time and memory usage as the number of explored states expands`,
          `Naming variables clearly in source files`,
          `Displaying clean labels on the user interface`,
          `Checking inputs at the start of a function`,
        ],
        ansIndex: 0,
        exp: `As explored states grow on larger instances, time and memory demands scale up rapidly.`,
      },
      {
        q: `If two approaches in ${topic} both find valid answers but one explores far fewer states, why does it win?`,
        opts: [
          `Exploring fewer states lowers runtime and memory pressure on bigger inputs`,
          `Exploring more states always produces a shorter final answer`,
          `State counts only change button colors on screen`,
          `Fewer states mean goal conditions are skipped`,
        ],
        ansIndex: 0,
        exp: `Exploring fewer states saves both time and memory, especially as input size grows.`,
      },
      {
        q: `If an evaluation function in ${topic} is consistent, what property does it maintain along a path?`,
        opts: [
          `Estimated costs along a step do not drop below the step cost plus next estimate`,
          `Goal conditions no longer need to be checked`,
          `Every transition automatically has zero cost`,
          `Constraints can be ignored safely`,
        ],
        ansIndex: 0,
        exp: `Consistency keeps step-to-step estimates well-behaved and avoids unnecessary re-exploration.`,
      },
      {
        q: `What is the main risk of tuning ${topic} strictly for one specific example?`,
        opts: [
          `It may overfit that example and perform poorly on unseen test cases`,
          `It will speed up every unrelated algorithm automatically`,
          `It removes all syntax rules from the language`,
          `It makes every corner case effortless`,
        ],
        ansIndex: 0,
        exp: `Tuning too narrowly to one example risks overfitting and weak performance on unseen cases.`,
      },
    ],
  };

  const chosenBank = banks[level] || banks.Medium;

  return Array.from({ length: count }, (_, idx) => {
    const base = chosenBank[idx % chosenBank.length];
    const round = Math.floor(idx / chosenBank.length);
    const suffix = round > 0 ? ` (Set ${round + 1})` : '';
    const cleanOpts = base.opts.map((o) => sanitizeQuizText(o + suffix));
    const correctAnswer = cleanOpts[base.ansIndex] || cleanOpts[0];

    return {
      id: `q-${idx + 1}`, question: sanitizeQuizText(`${base.q}${suffix}`), options: cleanOpts, correctAnswer, explanation: sanitizeQuizText(base.exp), }; }); };  export const generateQuizWithGemini = async ( sourceText = '', questionCount = 5, difficulty = 'Medium' ) => { const count = Math.max(1, Math.min(20, Number(questionCount) || 5)); const cleanTopic = stripTopicNoise(sourceText); const level = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium'; const apiKey = process.env.GEMINI_API_KEY;  const levelInstructions = { Easy: 'Write beginner-friendly questions focused on core definitions, key terms, and basic concepts.', Medium: 'Write intermediate questions focused on how mechanisms work, comparisons, practical usage, and cause-and-effect.', Hard: 'Write challenging questions focused on edge cases, optimality conditions, performance trade-offs, and deeper analysis.', }[level];  const fallbackQuestions = buildLevelSpecificQuestions(cleanTopic, count, level);  if (apiKey) { try { const contextSnippet = String(sourceText || '').slice(0, 3000); const prompt = [ `Generate ${count} distinct multiple-choice exam questions for "${cleanTopic}" at "${level}" difficulty.`,
        contextSnippet ? `Reference material:\n${contextSnippet}` : '',
        levelInstructions,
        'Rules: Do not write the word PDF, leading section numbers like 4. or 6.2, file extensions, or symbols like #, $, ^, *, `, ~, |, {, }, [, ], <, >.',
        'Provide 4 options per question and set correctAnswer to match one option exactly.',
        'Return ONLY valid JSON: {"questions":[{"question":"...","options":["...","...","...","..."],"correctAnswer":"...","explanation":"..."}]}',
      ]
        .filter(Boolean)
        .join('\n');

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
        contents: prompt,
      });

      const rawText = String(response?.text || '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      const parsed = JSON.parse(rawText);

      if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
        const sanitized = parsed.questions.slice(0, count).map((item, idx) => {
          const fb = fallbackQuestions[idx] || fallbackQuestions[0];
          const rawOpts = Array.isArray(item?.options) ? item.options : [];
          const opts =
            rawOpts.length >= 2
              ? rawOpts
                  .slice(0, 4)
                  .map((o, i) => sanitizeQuizText(o) || fb.options[i] || `Option ${i + 1}`)
              : fb.options;

          const cleanedAns = sanitizeQuizText(item?.correctAnswer || '').toLowerCase();
          const matchedOpt = opts.find((o) => o.toLowerCase() === cleanedAns);
          const matchedAns = matchedOpt || opts[0];

          return {
            id: `q-${idx + 1}`,
            question: sanitizeQuizText(item?.question) || fb.question,
            options: opts,
            correctAnswer: matchedAns,
            explanation: sanitizeQuizText(item?.explanation) || fb.explanation,
          };
        });

        return { questions: sanitized };
      }
    } catch (err) {
      console.warn('Quiz generator fallback active:', err?.message || err);
    }
  }

  return { questions: fallbackQuestions };
};