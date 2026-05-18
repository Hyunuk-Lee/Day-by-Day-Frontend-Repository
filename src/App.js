import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Mainpage from './pages/Mainpage';
import Calendar from './pages/Calendar';
import Recommended from './pages/Recommended';
import Mypage from './pages/Mypage';
import Login from './pages/Login';
import Register from './pages/Register';
import WriteDiary from './pages/WriteDiary';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Mainpage />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/recommended" element={<Recommended />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path='/Mypage' element={<Mypage />} />
          <Route path="/diary/write" element={<WriteDiary />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;