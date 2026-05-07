import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Page1() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    // ===== 추후 백엔드 연동 시 사용할 코드 =====
    // axios.post('http://localhost:8080/api/logout');
    // localStorage.removeItem('token');
    // =========================================
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>페이지 1</h1>
      {user ? (
        <p>안녕하세요, <strong>{user.username}</strong>님!</p>
      ) : (
        <p>로그인이 필요합니다.</p>
      )}
      <button onClick={() => navigate('/page2')} style={{ margin: '8px' }}>페이지 2로 이동</button>
      <button onClick={() => navigate('/page3')} style={{ margin: '8px' }}>페이지 3으로 이동</button>
      {user ? (
        <button onClick={handleLogout} style={{ margin: '8px' }}>로그아웃</button>
      ) : (
        <button onClick={() => navigate('/login')} style={{ margin: '8px' }}>로그인</button>
      )}
    </div>
  );
}

export default Page1;