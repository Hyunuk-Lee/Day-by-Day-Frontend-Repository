import { useState } from "react";
import { Link } from "react-router-dom";
import shared from "../styles/auth-shared.module.css";
import styles from "./Login.module.css";

function AuthForm({
  icon,
  title,
  subtitle,
  submitLabel,
  footerText,
  footerLinkText,
  footerLinkTo,
  showPasswordConfirm = false,
  onSubmit,
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (showPasswordConfirm && password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (!username || !password) {
      alert("아이디와 비밀번호를 입력해주세요.");
      return;
    }

    await onSubmit({ username, password, passwordConfirm });
  };

  return (
    <div className={shared.page}>
      <div className={shared.card}>
        <div className={styles.icon}>{icon}</div>
        <h1 className={shared.title}>{title}</h1>
        <p className={shared.subtitle}>{subtitle}</p>

        <form onSubmit={handleSubmit} className={shared.form}>
          <div className={shared.field}>
            <label className={shared.label}>아이디</label>
            <input
              type="text"
              className={shared.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="아이디를 입력하세요"
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

          {showPasswordConfirm && (
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
          )}

          <button type="submit" className={shared.button}>
            {submitLabel}
          </button>
        </form>

        <p className={shared.footer}>
          {footerText}
          <Link to={footerLinkTo} className={shared.link}>
            {footerLinkText}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default AuthForm;
