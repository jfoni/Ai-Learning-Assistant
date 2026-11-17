import axios from 'axios';

const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000/api'
  : '/api';

const API_URL = `${API_BASE_URL}/documents`;

export const fetchDocuments = async (userId) => {
  const url = userId ? `${API_URL}/${userId}` : API_URL;
  const response = await axios.get(url);
  return response.data.data;
};

export const uploadDocument = async (formData) => {
  const response = await axios.post(`${API_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data.data;
};

export const deleteDocument = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
};