import axios from 'axios';

const API_URL = 'http://localhost:8000/api/documents/';

// Upload document
export const uploadDocument = async (formData) => {
  const response = await axios.post(`${API_URL}upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

// Get documents
export const getDocuments = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

// Delete document
export const deleteDocument = async (id) => {
  const response = await axios.delete(`${API_URL}${id}`);
  return response.data;
};