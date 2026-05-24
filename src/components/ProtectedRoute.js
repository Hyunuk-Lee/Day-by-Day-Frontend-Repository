import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, initialized } = useAuth();
  const location = useLocation();

  // 초기화 전이라면 아무것도 렌더하지 않음 (튕김 방지)
  if (!initialized) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default ProtectedRoute;