// Login.js
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import shared from '../styles/auth-shared.module.css';
import styles from './Login.module.css';
import axios from 'axios'

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (username && password) {
      login(username);
      navigate('/');
    } else {
      alert('아이디와 비밀번호를 입력해주세요.');
    }
  };

  return (
    <div className={shared.page}>
      <div className={shared.card}>
        <div className={styles.icon}>📖</div>
        <h1 className={shared.title}>다시 오신 걸 환영해요</h1>
        <p className={shared.subtitle}>오늘의 마음을 기록해볼까요?</p>

        <form onSubmit={handleSubmit} className={shared.form}>
          <div className={shared.field}>
            <label className={shared.label}>아이디</label>
            <input
              type="text"
              className={shared.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
            />
          </div>
          <div className={shared.field}>
            <label className={shared.label}>비밀번호</label>
            <input
              type="password"
              className={shared.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          <button type="submit" className={shared.button}>
            로그인
          </button>
        </form>

        <p className={shared.footer}>
          계정이 없으신가요?
          <Link to="/register" className={shared.link}>회원가입</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;