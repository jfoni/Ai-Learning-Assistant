import axios from 'axios';

const API_URL = 'http://localhost:8000/api/flashcards/';

// Extract flashcards array from various possible API response shapes
const extractCardsFromResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.flashcards)) return payload.flashcards;
  if (Array.isArray(payload.cards)) return payload.cards;
  if (payload.data) {
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.data.flashcards)) return payload.data.flashcards;
    if (Array.isArray(payload.data.cards)) return payload.data.cards;
    if (payload.data.deck && Array.isArray(payload.data.deck.cards)) {
      return payload.data.deck.cards;
    }
  }
  return [];
};

// Generate flashcards from a document or custom topic
export const generateFlashcards = async ({
  userId,
  documentId = null,
  customTopic = '',
  difficulty = 'medium',
  questionType = 'mixed',
  cardCount = 5,
  batchIndex = 1,
  totalRequested = 5,
}) => {
  const endpoint = documentId
    ? `${API_URL}${documentId}`
    : `${API_URL}generate`;

  const response = await axios.post(endpoint, {
    userId,
    documentId: documentId || null,
    customTopic: customTopic.trim(),
    difficulty,
    questionType,
    cardCount: Number(cardCount),
    batchIndex: Number(batchIndex),
    totalRequested: Number(totalRequested),
  });

  const cards = extractCardsFromResponse(response.data);
  return {
    raw: response.data,
    flashcards: cards,
    title:
      response.data?.data?.title ||
      response.data?.title ||
      customTopic.trim() ||
      '',
  };
};

// Get flashcards by user
export const getFlashcardsByUser = async (userId) => {
  const response = await axios.get(`${API_URL}user/${userId}`);
  return response.data;
};

// Review card
export const reviewCard = async (id, data) => {
  const response = await axios.patch(`${API_URL}review/${id}`, data);
  return response.data;
};

// Toggle favorite
export const toggleFavorite = async (id) => {
  const response = await axios.patch(`${API_URL}favorite/${id}`);
  return response.data;
};

// Delete flashcard
export const deleteFlashcard = async (id) => {
  const response = await axios.delete(`${API_URL}${id}`);
  return response.data;
};