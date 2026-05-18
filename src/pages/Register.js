import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import AuthForm from "./AuthForm";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async ({ username, password }) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/auth/register/",
        {
          username,
          password,
        },
      );

      const { token, username: responseUsername, id } = response.data;
      login(responseUsername, id, token);

      alert("회원가입 성공!");
      navigate("/");
    } catch (error) {
      const message =
        error.response?.data?.message || "회원가입 실패. 다시 시도해주세요.";
      alert(message);
    }
  };

  return (
    <AuthForm
      icon="✨"
      title="새로운 시작"
      subtitle="당신만의 감정 다이어리를 만들어보세요"
      submitLabel="회원가입"
      footerText="이미 계정이 있으신가요?"
      footerLinkText="로그인"
      footerLinkTo="/login"
      showPasswordConfirm
      onSubmit={handleSubmit}
    />
  );
}

export default Register;
