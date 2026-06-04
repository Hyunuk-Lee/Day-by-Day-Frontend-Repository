import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Mainpage from './pages/Mainpage';
import Calendar from './pages/Calendar';
import Recommended from './pages/Recommended';
import Mypage from './pages/Mypage';
import Login from './pages/Login';
import Register from './pages/Register';
import WriteDiary from './pages/WriteDiary';
import DiaryDetail from './pages/DiaryDetail';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 비로그인 전용 */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* 로그인 필수 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Mainpage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <ProtectedRoute>
                <Calendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/recommended"
            element={
              <ProtectedRoute>
                <Recommended />
              </ProtectedRoute>
            }
          />
          <Route
            path="/Mypage"
            element={
              <ProtectedRoute>
                <Mypage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diary/write"
            element={
              <ProtectedRoute>
                <WriteDiary />
              </ProtectedRoute>
            }
          />
          <Route
            path="/diary/:username/:date"
            element={
              <ProtectedRoute>
                <DiaryDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;