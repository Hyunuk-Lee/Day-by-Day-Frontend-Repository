import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialized, setInitialized] = useState(false); // 추가

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common["Authorization"] = `Token ${token}`;
    }
    setInitialized(true); // 추가: 초기화 완료 표시
  }, []);

  const login = (username, id, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify({ username, id }));
    setUser({ username, id });
    axios.defaults.headers.common["Authorization"] = `Token ${token}`;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}