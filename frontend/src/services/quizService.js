import axios from 'axios';

const API_URL = 'http://localhost:8000/api/quizzes/';

// Generate quiz
export const generateQuiz = async (data) => {
  const response = await axios.post(`${API_URL}generate`, data);
  return response.data;
};

// Get all quizzes
export const getAllQuizzes = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Get quiz by ID
export const getQuizById = async (id) => {
  const response = await axios.get(`${API_URL}${id}`);
  return response.data;
};

// Submit quiz
export const submitQuiz = async (data) => {
  const response = await axios.post(`${API_URL}submit`, data);
  return response.data;
};

// Get quiz results
export const getQuizResults = async (quizId) => {
  const response = await axios.get(`${API_URL}${quizId}/results`);
  return response.data;
};

// Delete quiz
export const deleteQuiz = async (id) => {
  const response = await axios.delete(`${API_URL}${id}`);
  return response.data;
};