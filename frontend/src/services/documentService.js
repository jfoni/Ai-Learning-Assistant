import axios from 'axios';

const RAW_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000')
  .replace(/\/+$/, '')
  .replace(/\/api$/, '');

const API_BASE = `${RAW_BASE_URL}/api/documents`;

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