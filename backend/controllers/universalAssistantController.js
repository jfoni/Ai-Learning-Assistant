import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const VALID_MODES = new Set(['document', 'general']);
const VALID_LEVELS = new Set(['School', 'College', 'University']);
const VALID_STYLES = new Set(['Simple', 'Detailed', 'Step-by-Step']);
const VALID_LANGUAGES = new Set(['English', 'Bangla', 'Bangla-English']);
const VALID_ACTIONS = new Set([
  'normal',
  'explain_again',
  'simplify',
  'example',
  'step_by_step',
]);

const wantsBanglaFromPrompt = (text = '') => {
  const s = String(text || '');
  if (/[\u0980-\u09FF]/.test(s)) return true;
  return /\b(bangla|bengali|banglay|banglae|banglate|bhashay)\b/i.test(s);
};

const wantsImagePlaceholderEmpty = (text = '') => {
  return /\b(image|photo|picture|diagram|img|chobi|chobir|image er jayga|empty)\b/i.test(
    String(text || '')
  );
};

const cleanAiSymbols = (rawText = '') => {
  return String(rawText || '')
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '')
    )
    .replace(/[#*$%^&~`|]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const buildPreferenceInstructions = ({
  level = 'University',
  style = 'Detailed',
  language = 'English',
  action = 'normal',
  userMessage = '',
}) => {
  const safeLevel = VALID_LEVELS.has(level) ? level : 'University';
  const safeStyle = VALID_STYLES.has(style) ? style : 'Detailed';
  const safeAction = VALID_ACTIONS.has(action) ? action : 'normal';

  const userAskedBangla = wantsBanglaFromPrompt(userMessage);
  const effectiveLang = userAskedBangla
    ? 'Bangla'
    : language === 'Bangla'
    ? 'Bangla'
    : 'English';

  const langRule =
    effectiveLang === 'Bangla'
      ? 'The user requested or spoke in Bangla. Reply in clear, natural Bangla.'
      : 'Default language rule: Always respond in clear, natural English unless the user explicitly asks or speaks in Bangla.';

  const imageRule = wantsImagePlaceholderEmpty(userMessage)
    ? 'Whenever an image or visual space is mentioned or requested, keep the image area completely empty and do not insert image placeholders, fake image links, or ASCII art.'
    : 'Keep any image area empty if not applicable; do not insert fake image links or ASCII art.';

  const formattingRule =
    'Strict symbol rule: Never use markdown or decorative symbols like #, $, %, ^, &, *, `, ~, or |. Use plain text and simple bullet lines starting with "- " when listing points.';

  const actionRuleMap = {
    normal: 'Answer thoroughly and helpfully.',
    explain_again:
      'The student asked to explain again. Re-explain the concept from a fresh angle with clearer wording.',
    simplify:
      'The student asked to simplify this. Break down hard terms and keep the explanation easy to understand.',
    example:
      'The student asked for an example. Provide a clear, practical example.',
    step_by_step:
      'The student asked for a step-by-step explanation. Present each step clearly in order.',
  };

  return [
    `Student Academic Level: ${safeLevel}.`,
    `Preferred Explanation Style: ${safeStyle}.`,
    langRule,
    imageRule,
    formattingRule,
    `Interaction Directive: ${actionRuleMap[safeAction]}`,
  ].join('\n');
};

export const askUniversalAssistantController = async (req, res) => {
  try {
    const {
      userId,
      mode = 'general',
      message = '',
      document = null,
      history = [],
      preferences = {},
      action = 'normal',
      targetAnswer = '',
    } = req.body || {};

    if (!userId || String(userId).trim() === '') {
      return res.status(401).json({
        success: false,
        message: 'Authenticated userId is required.',
      });
    }

    const safeMode = VALID_MODES.has(mode) ? mode : 'general';
    const promptText = String(message || '').trim();

    if (!promptText && action === 'normal') {
      return res.status(400).json({
        success: false,
        message: 'Please enter a question or learning prompt.',
      });
    }

    if (safeMode === 'document') {
      const docContent = String(
        document?.content || document?.text || document?.extractedText || ''
      ).trim();

      if (!docContent) {
        return res.status(400).json({
          success: false,
          message:
            'Please select a document with readable text to use Document Learning Mode.',
        });
      }
    }

    const prefBlock = buildPreferenceInstructions({
      level: preferences?.level,
      style: preferences?.style,
      language: VALID_LANGUAGES.has(preferences?.language)
        ? preferences.language
        : 'English',
      action,
      userMessage: promptText || targetAnswer,
    });

    const formattedHistory = (Array.isArray(history) ? history : [])
      .slice(-8)
      .map(
        (m) =>
          `${m.role === 'assistant' ? 'Assistant' : 'Student'}: ${cleanAiSymbols(
            String(m.content || '')
          ).slice(0, 1200)}`
      )
      .join('\n');

    if (!genAI) {
      return res.status(503).json({
        success: false,
        message: 'Gemini API key is not configured on the server.',
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

    const docContextText =
      safeMode === 'document'
        ? String(
            document?.content || document?.text || document?.extractedText || ''
          ).slice(0, 14000)
        : '';

    const systemInstruction =
      safeMode === 'document'
        ? `You are AI Universal Learning Assistant operating in DOCUMENT LEARNING MODE.
Rules:
1. Ground your answers strictly in the provided document content below.
2. Never fabricate facts, pages, sections, or quotes that are not in the document.
3. If the answer is not found in the document, state clearly that the selected document does not contain that information.
4. When information is found in the document, mention the relevant section/heading/page/passage if visible in the text.

${prefBlock}

Document Title: ${String(document?.title || 'Selected Document')}
Document Content:
"""
${docContextText}
"""`
        : `You are AI Universal Learning Assistant operating in GENERAL LEARNING MODE.
Rules:
1. Help with programming, math, science, engineering, and academic or general concepts clearly.
2. Solve problems step by step when helpful, explain code/errors clearly, provide practical examples, and generate practice questions when requested.
3. Be honest about uncertainty; do not claim document sources when no document is selected.

${prefBlock}`;

    const effectiveUserPrompt =
      action !== 'normal' && targetAnswer
        ? `Previous Assistant Explanation:\n"""\n${cleanAiSymbols(
            String(targetAnswer)
          ).slice(0, 2500)}\n"""\n\nFollow-up Request: ${
            promptText || `Apply action "${action}" to the explanation above.`
          }`
        : promptText;

    const fullPrompt = `${systemInstruction}

Recent Conversation Context:
${formattedHistory || 'No prior turns in this conversation.'}

Student Request:
${effectiveUserPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const rawReply = result?.response?.text()?.trim() || '';
    const reply = cleanAiSymbols(rawReply);

    if (!reply) {
      return res.status(502).json({
        success: false,
        message: 'Empty response received from AI model.',
      });
    }

    return res.json({
      success: true,
      mode: safeMode,
      reply,
      documentTitle:
        safeMode === 'document' ? document?.title || 'Selected Document' : null,
    });
  } catch (err) {
    console.error('Universal assistant error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate response from AI Learning Assistant.',
    });
  }
};