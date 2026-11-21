const RAW_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'http://localhost:8000';

const cleanBaseUrl = String(RAW_BASE)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

const parseJsonSafe = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Request failed (${res.status})`
    );
  }
  return data;
};

export const loadUserDocumentsForTeachMe = async (userId) => {
  if (!userId) return [];
  try {
    const res = await fetch(
      `${cleanBaseUrl}/api/documents?userId=${encodeURIComponent(userId)}`
    );
    if (!res.ok) return [];
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.documents)) return data.documents;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch {
    return [];
  }
};

export const evaluateTeachMeExplanation = async ({
  userId,
  topic,
  sourceType = 'manual',
  documentId = '',
  documentTitle = '',
  documentContent = '',
  difficulty = 'Beginner',
  explanation,
}) => {
  const res = await fetch(`${cleanBaseUrl}/api/teach-me/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      topic,
      sourceType,
      documentId,
      documentTitle,
      documentContent,
      difficulty,
      explanation,
    }),
  });
  return parseJsonSafe(res);
};

export const interactWithTeachMe = async ({
  userId,
  sessionId,
  interactionType = 'answer_followup',
  studentReply = '',
  confusingPart = '',
}) => {
  const res = await fetch(`${cleanBaseUrl}/api/teach-me/interact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      sessionId,
      interactionType,
      studentReply,
      confusingPart,
    }),
  });
  return parseJsonSafe(res);
};

export const fetchTeachMeHistory = async (userId) => {
  if (!userId) return [];
  const res = await fetch(
    `${cleanBaseUrl}/api/teach-me/history/${encodeURIComponent(
      userId
    )}?userId=${encodeURIComponent(userId)}`
  );
  const data = await parseJsonSafe(res);
  return Array.isArray(data?.sessions) ? data.sessions : [];
};

export const deleteTeachMeSession = async (sessionId, userId) => {
  if (!sessionId || !userId) {
    throw new Error('Session ID and User ID are required.');
  }
  const res = await fetch(
    `${cleanBaseUrl}/api/teach-me/session/${encodeURIComponent(
      sessionId
    )}?userId=${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    }
  );
  return parseJsonSafe(res);
};

export const clearAllTeachMeHistory = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required.');
  }
  const res = await fetch(
    `${cleanBaseUrl}/api/teach-me/history/${encodeURIComponent(
      userId
    )}?userId=${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    }
  );
  return parseJsonSafe(res);
};