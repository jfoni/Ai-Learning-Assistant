import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/documents';

export const fetchDocuments = async (userId) => {
  const url = userId ? `${API_BASE_URL}/${userId}` : `${API_BASE_URL}`;
  const response = await axios.get(url);
  return response.data.data;
};

export const uploadDocument = async (formData) => {
  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data.data;
};

export const analyzeDocument = async (id) => {
  const response = await axios.post(`${API_BASE_URL}/${id}/analyze`);
  return response.data.data.summary;
};

export const deleteDocument = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/${id}`);
  return response.data;
};