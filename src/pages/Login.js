import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import axios from 'axios';  // 백엔드 연동 시 주석 해제

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ===== 추후 백엔드 연동 시 사용할 코드 =====
    // try {
    //   const response = await axios.post('http://localhost:8080/api/login', {
    //     username,
    //     password,
    //   });
    //   // 응답 예시: { token: 'jwt...', username: 'hong' }
    //   // 토큰이 있다면 localStorage 저장: localStorage.setItem('token', response.data.token);
    //   login(response.data.username);
    //   navigate('/');
    // } catch (error) {
    //   alert('로그인 실패: ' + (error.response?.data?.message || '서버 오류'));
    // }
    // =========================================

    // 백엔드 연동 전 임시 로직 (입력값만 있으면 로그인 성공 처리)
    if (username && password) {
      login(username);
      navigate('/');
    } else {
      alert('아이디와 비밀번호를 입력해주세요.');
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>로그인</h1>
      <form onSubmit={handleSubmit} style={{ display: 'inline-block', textAlign: 'left' }}>
        <div style={{ marginBottom: '12px' }}>
          <label>아이디: </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label>비밀번호: </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">로그인</button>
      </form>
      <p>
        계정이 없으신가요? <Link to="/register">회원가입</Link>
      </p>
    </div>
  );
}

export default Login;