import React, { useState } from 'react';
import axios from 'axios';

export default function Login({ onLogin }) {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await axios.post('/api/login', { login, password });
      const token = res.data.token;
      localStorage.setItem('kanban-token', token);
      localStorage.setItem('kanban-token-time', Date.now().toString());
      axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
      onLogin(token);
    } catch (err) {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Вход</h2>
        {error && <div className="error">{error}</div>}
        <input
          type="text"
          placeholder="Login"
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Войти</button>
      </form>
    </div>
  );
}
