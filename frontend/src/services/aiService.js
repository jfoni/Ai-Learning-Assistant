import axios from 'axios';

const API_URL = 'http://localhost:8000/api/ai/';

// Generate AI flashcards
export const generateFlashcards = async (data) => {
  const response = await axios.post(`${API_URL}flashcards`, data);
  return response.data;
};

// Generate summary
export const generateSummary = async (data) => {
  const response = await axios.post(`${API_URL}summary`, data);
  return response.data;
};

// Explain a concept
export const explainConcept = async (data) => {
  const response = await axios.post(`${API_URL}explain`, data);
  return response.data;
};

// Send AI chat message
export const chatWithAI = async (data) => {
  const response = await axios.post(`${API_URL}chat`, data);
  return response.data;
};

// Get chat history
export const getChatHistory = async (documentId) => {
  const response = await axios.get(`${API_URL}chat-history/${documentId}`);
  return response.data;
};