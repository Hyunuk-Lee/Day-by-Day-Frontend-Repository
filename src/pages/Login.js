import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthForm from "./AuthForm";
import axios from "axios";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // ProtectedRoute에서 넘어온 경우 원래 가려던 경로, 아니면 메인으로
  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async ({ username, password }) => {
    try {
      const response = await axios.post(
        "/api/auth/login/",
        {
          username,
          password,
        },
      );

      const { token, username: responseUsername, id } = response.data;
      login(responseUsername, id, token);

      navigate(from, { replace: true });
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "로그인 실패. 아이디와 비밀번호를 확인해주세요.";
      alert(message);
    }
  };

  return (
    <AuthForm
      icon="📖"
      title="다시 오신 걸 환영해요"
      subtitle="오늘의 마음을 기록해볼까요?"
      submitLabel="로그인"
      footerText="계정이 없으신가요?"
      footerLinkText="회원가입"
      footerLinkTo="/register"
      onSubmit={handleSubmit}
    />
  );
}

export default Login;