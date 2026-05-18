import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios"; // 백엔드 연동 시 주석 해제
import shared from "../styles/auth-shared.module.css";
import styles from "./Login.module.css";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!username || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    try {
      const response = await axios.post(
        "http://127.0.0.1:8000/api/auth/register/",
        {
          username,
          password,
        },
      );

      // 성공: 토큰과 사용자 정보를 context에 저장
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
    <div className={shared.page}>
      <div className={shared.card}>
        <div className={styles.icon}>✨</div>
        <h1 className={shared.title}>새로운 시작</h1>
        <p className={shared.subtitle}>당신만의 감정 다이어리를 만들어보세요</p>

        <form onSubmit={handleSubmit} className={shared.form}>
          <div className={shared.field}>
            <label className={shared.label}>아이디</label>
            <input
              type="text"
              className={shared.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="사용할 아이디를 입력하세요"
            />
          </div>
          <div className={shared.field}>
            <label className={shared.label}>비밀번호</label>
            <input
              type="password"
              className={shared.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
            />
          </div>
          <div className={shared.field}>
            <label className={shared.label}>비밀번호 확인</label>
            <input
              type="password"
              className={shared.input}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="비밀번호를 다시 입력하세요"
            />
          </div>
          <button type="submit" className={shared.button}>
            회원가입
          </button>
        </form>

        <p className={shared.footer}>
          이미 계정이 있으신가요?
          <Link to="/login" className={shared.link}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
