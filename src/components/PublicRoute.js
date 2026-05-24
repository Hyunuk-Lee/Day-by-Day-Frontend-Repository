import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PublicRoute({ children }) {
  const { user, initialized } = useAuth();

  if (!initialized) return null;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default PublicRoute;