import axios from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api'
  : '/api';

const API_URL = `${API_BASE_URL}/dashboard/`;

export const getDashboardOverview = async (userId = '') => {
  const url = userId ? `${API_URL}overview?userId=${userId}` : `${API_URL}overview`;
  const response = await axios.get(url);
  return response.data;
};