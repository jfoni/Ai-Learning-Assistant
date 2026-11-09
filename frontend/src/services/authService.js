import axios from 'axios';

// Backend API Base URL (Port 8000 matching your server)
const API_URL = 'http://localhost:8000/api/auth/';

// Register User
export const registerUser = async (userData) => {
  const response = await axios.post(`${API_URL}register`, userData);
  return response;
};

// Login User
export const loginUser = async (userData) => {
  const response = await axios.post(`${API_URL}login`, userData);
  return response;
};

// Get User Profile
export const getUserProfile = async (token) => {
  const response = await axios.get(`${API_URL}profile`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response;
};