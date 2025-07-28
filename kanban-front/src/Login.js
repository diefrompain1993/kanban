import React, { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { api } from './api';

export default function Login({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    try {
      // ВАЖНО: backend ожидает username, а не login
      const { data } = await api.post('/login', {
        username: login,
        password,
      });

      const token = data.token;

      // Сохраняем токен и добавляем его в api-инстанс
      localStorage.setItem('kanban-token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Уведомляем App, что логин прошёл успешно
      onLogin(token);
    } catch (err) {
      console.error('Login error:', err);
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
