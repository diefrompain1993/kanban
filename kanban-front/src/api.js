// src/api.js
import axios from 'axios';

// В development: создайте в korne файл .env.development с
//   REACT_APP_API_URL=http://localhost:3001
// В production: не задавайте эту переменную, тогда API_ROOT = ''
const API_ROOT = process.env.REACT_APP_API_URL || '';

// Базовый URL для всех запросов: e.g. http://localhost:3001/api in dev,
// or /api in prod.
export const api = axios.create({
  baseURL: `${API_ROOT}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Если есть сохранённый токен — сразу добавляем его в заголовки
const token = localStorage.getItem('kanban-token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}
