import axios from 'axios';

const API_BASE = 'http://localhost:8000/api/documents';

export const fetchDocuments = async (userId) => {
  const res = await axios.get(`${API_BASE}/${userId}`);
  return res.data?.data || [];
};

export const uploadDocument = async (formData) => {
  const res = await axios.post(`${API_BASE}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data?.data;
};

export const analyzeDocument = async (docId, instruction = '') => {
  const res = await axios.post(`${API_BASE}/${docId}/analyze`, {
    instruction,
  });
  return res.data?.data?.summary || '';
};

export const deleteDocument = async (docId) => {
  const res = await axios.delete(`${API_BASE}/${docId}`);
  return res.data;
};