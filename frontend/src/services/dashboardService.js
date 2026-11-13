import axios from 'axios';

// Automatically use local backend for localhost, and live/production backend if deployed
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api'
  : 'https://ai-learning-assistant-opal.vercel.app/api';
const API_URL = `${API_BASE_URL}/dashboard/`;

// Get dashboard overview stats
export const getDashboardOverview = async (userId = '') => {
  const url = userId ? `${API_URL}overview?userId=${userId}` : `${API_URL}overview`;
  const response = await axios.get(url);
  return response.data;
};