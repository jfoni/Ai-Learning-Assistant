import axios from 'axios';

const API_URL = 'http://localhost:8000/api/flashcards/';

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