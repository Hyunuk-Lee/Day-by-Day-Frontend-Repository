import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // user 상태: 로그인 안 한 경우 null, 로그인 시 { username: '...', id: ... }
  const [user, setUser] = useState(null);

  // 초기화: localStorage에서 저장된 토큰 읽어오기
  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      // 이후 API 요청에 토큰을 자동으로 포함하도록 axios 기본값 설정
      axios.defaults.headers.common["Authorization"] = `Token ${token}`;
    }
  }, []);

  const login = (username, id, token) => {
    // localStorage에 토큰과 사용자 정보 저장
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify({ username, id }));

    // state 업데이트
    setUser({ username, id });

    // 이후 API 요청에 토큰을 자동으로 포함하도록 axios 기본값 설정
    axios.defaults.headers.common["Authorization"] = `Token ${token}`;
  };

  const logout = () => {
    // localStorage에서 토큰과 사용자 정보 삭제
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // state 초기화
    setUser(null);

    // axios 기본값에서 Authorization 헤더 제거
    delete axios.defaults.headers.common["Authorization"];
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
