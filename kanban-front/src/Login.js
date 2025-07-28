// src/Login.js
import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { api } from './api';

export default function Login({ onLogin }) {
  const [login, setLogin]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      // В деве: POST http://localhost:3001/api/login
      // В проде: POST /api/login
      const { data } = await api.post('/login', { login, password });
      const token = data.token;

      // Сохраняем токен и добавляем в api-инстанс
      localStorage.setItem('kanban-token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Уведомляем App, что логин прошёл успешно
      onLogin(token);
    } catch {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">Вход</h2>
        {error && <div className="error">{error}</div>}

        <input
          type="text"
          placeholder="Логин"
          value={login}
          onChange={e => setLogin(e.target.value)}
          required
        />

        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="eye-button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <button type="submit">Войти</button>
      </form>
    </div>
  );
}
