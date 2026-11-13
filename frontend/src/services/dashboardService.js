import axios from 'axios';

const API_URL = 'http://localhost:8000/api/dashboard/';

// Get dashboard overview stats
export const getDashboardOverview = async (userId = '') => {
  const url = userId ? `${API_URL}overview?userId=${userId}` : `${API_URL}overview`;
  const response = await axios.get(url);
  return response.data;
};