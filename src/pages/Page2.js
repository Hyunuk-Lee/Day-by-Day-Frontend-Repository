import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Page2() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:8000/api/logout/',
        {},
        { headers: { Authorization: `Token ${token}` } }  // 토큰 인증 헤더
      );
    } catch (error) {
      console.error('로그아웃 요청 실패', error);
    }
    localStorage.removeItem('token');
    logout();
    navigate('/login');
  };

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>페이지 2</h1>
      {user ? (
        <p>안녕하세요, <strong>{user.username}</strong>님!</p>
      ) : (
        <p>로그인이 필요합니다.</p>
      )}
      <button onClick={() => navigate('/')} style={{ margin: '8px' }}>페이지 1로 이동</button>
      <button onClick={() => navigate('/page3')} style={{ margin: '8px' }}>페이지 3으로 이동</button>
      {user && <button onClick={handleLogout} style={{ margin: '8px' }}>로그아웃</button>}
    </div>
  );
}

export default Page2;