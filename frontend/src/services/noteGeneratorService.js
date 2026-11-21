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

export const loadUserDocumentsForNotes = async (userId) => {
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

export const extractDocumentContentForNotes = async (doc) => {
  const existing = String(
    doc?.content || doc?.text || doc?.extractedText || doc?.summary || ''
  ).trim();
  if (existing) return existing.slice(0, 60000);

  const docId = doc?._id || doc?.id;
  if (docId && !String(docId).startsWith('temp-')) {
    try {
      const res = await fetch(
        `${cleanBaseUrl}/api/documents/${encodeURIComponent(docId)}/extract`
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.content) {
          return String(data.content).trim().slice(0, 60000);
        }
      }
    } catch {
      // Fallback below
    }
  }

  const cleanTopic = String(doc?.title || 'Study Material')
    .replace(/\.(pdf|pptx?|docx?|txt|md)$/i, '')
    .replace(/\(\d+\)/g, '')
    .replace(/^\d+(\.\d+)*\s*/, '')
    .trim();

  return `Topic: ${cleanTopic || doc?.title || 'Study Material'}`;
};

export const uploadPdfOrDocumentForNotes = async ({ file, userId }) => {
  if (!file) {
    throw new Error('Please choose a PDF or document file first.');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name);
  if (userId) {
    formData.append('userId', userId);
  }

  const res = await fetch(`${cleanBaseUrl}/api/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Upload failed (${res.status})`
    );
  }

  const doc = data?.data || data?.document || data;
  if (!doc) {
    throw new Error('Uploaded file response did not include document data.');
  }

  return doc;
};

export const generateStudyNote = async ({
  userId,
  documentId,
  documentTitle,
  documentContent,
  topicScope = 'entire',
  topic = '',
  noteType = 'Detailed Study Notes',
  difficulty = 'Intermediate',
  language = 'English',
}) => {
  const res = await fetch(`${cleanBaseUrl}/api/notes/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      documentId,
      documentTitle,
      documentContent: String(documentContent || '').slice(0, 60000),
      topicScope,
      topic,
      noteType,
      difficulty,
      language,
    }),
  });
  return parseJsonSafe(res);
};

export const fetchUserStudyNotes = async (userId) => {
  if (!userId) return [];
  const res = await fetch(
    `${cleanBaseUrl}/api/notes/user/${encodeURIComponent(
      userId
    )}?userId=${encodeURIComponent(userId)}`
  );
  const data = await parseJsonSafe(res);
  return Array.isArray(data?.notes) ? data.notes : [];
};

export const updateStudyNote = async (
  noteId,
  { userId, title, contentText, noteType, difficulty, language }
) => {
  const res = await fetch(
    `${cleanBaseUrl}/api/notes/${encodeURIComponent(noteId)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        title,
        contentText,
        noteType,
        difficulty,
        language,
      }),
    }
  );
  return parseJsonSafe(res);
};

export const deleteStudyNote = async (noteId, userId) => {
  const res = await fetch(
    `${cleanBaseUrl}/api/notes/${encodeURIComponent(
      noteId
    )}?userId=${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    }
  );
  return parseJsonSafe(res);
};