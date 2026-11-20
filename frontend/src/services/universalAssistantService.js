import axios from 'axios';
import { fetchDocuments } from './documentService';

const API_BASE = 'http://localhost:8000/api/assistant';

const getHistoryStorageKey = (userId) =>
  `universal_assistant_chats_${userId || 'guest'}`;

export const loadUserDocumentsForAssistant = async (userId) => {
  if (!userId) return [];
  const docs = await fetchDocuments(userId).catch(() => []);
  return Array.isArray(docs) ? docs : [];
};

export const getSavedConversations = (userId) => {
  try {
    const raw = localStorage.getItem(getHistoryStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveUserConversations = (userId, conversations) => {
  try {
    localStorage.setItem(
      getHistoryStorageKey(userId),
      JSON.stringify(Array.isArray(conversations) ? conversations : [])
    );
  } catch (err) {
    console.error('Failed to save chat history:', err);
  }
};

export const sendAssistantMessage = async ({
  userId,
  mode,
  message,
  document,
  history,
  preferences,
  action = 'normal',
  targetAnswer = '',
}) => {
  const res = await axios.post(`${API_BASE}/ask`, {
    userId,
    mode,
    message,
    document,
    history,
    preferences,
    action,
    targetAnswer,
  });

  if (!res.data?.success || !res.data?.reply) {
    throw new Error(res.data?.message || 'Unable to get assistant reply.');
  }

  return res.data;
};