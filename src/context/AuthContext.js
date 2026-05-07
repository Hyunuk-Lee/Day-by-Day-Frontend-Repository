import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user 상태: 로그인 안 한 경우 null, 로그인 시 { username: '...' }
  const [user, setUser] = useState(null);

  const login = (username) => {
    setUser({ username });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// 다른 컴포넌트에서 쉽게 사용하기 위한 커스텀 훅
export function useAuth() {
  return useContext(AuthContext);
}