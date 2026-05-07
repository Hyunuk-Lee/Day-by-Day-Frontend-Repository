import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import axios from 'axios';  // 백엔드 연동 시 주석 해제

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    // ===== 추후 백엔드 연동 시 사용할 코드 =====
    // try {
    //   const response = await axios.post('http://localhost:8080/api/register', {
    //     username,
    //     password,
    //   });
    //   // 응답 예시: { success: true, username: 'hong' }
    //   alert('회원가입 성공!');
    //   login(response.data.username);  // 가입 후 자동 로그인
    //   navigate('/');
    // } catch (error) {
    //   alert('회원가입 실패: ' + (error.response?.data?.message || '서버 오류'));
    // }
    // =========================================

    // 백엔드 연동 전 임시 로직
    if (username && password) {
      alert('회원가입 성공! (임시 로직)');
      login(username);
      navigate('/');
    } else {
      alert('모든 항목을 입력해주세요.');
    }
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>회원가입</h1>
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
        <div style={{ marginBottom: '12px' }}>
          <label>비밀번호 확인: </label>
          <input
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
          />
        </div>
        <button type="submit">회원가입</button>
      </form>
      <p>
        이미 계정이 있으신가요? <Link to="/login">로그인</Link>
      </p>
    </div>
  );
}

export default Register;