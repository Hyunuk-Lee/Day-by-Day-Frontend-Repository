import axios from 'axios';

// ─────────────────────────────────────────────────────────────
//  API Client (싱글톤 axios 인스턴스)
//
//  - dev:  .env.development의 REACT_APP_API_URL을 사용
//          (값 비우면 package.json proxy가 작동)
//  - prod: .env.production이 비어있으므로 '/api/...' 같은
//          상대 경로로 요청 → netlify.toml redirects가 백엔드로 프록시
//
//  ⚠️ 절대로 'http://54.180.152.247:8000'을 직접 쓰지 말 것!
//      그러면 Netlify(HTTPS)에서 Mixed Content 에러가 발생합니다.
// ─────────────────────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '',
});

// ─── 요청 인터셉터: localStorage 토큰을 자동으로 헤더에 부착 ───
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── 응답 인터셉터: 401일 때 자동 로그아웃 처리 (선택적) ───
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 등의 인증 실패 시 처리 (필요 시 활성화)
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;