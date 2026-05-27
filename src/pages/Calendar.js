import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './Calendar.module.css';

/* ====================================================
 * API Base URL
 * 운영 환경에서는 .env에 REACT_APP_API_URL을 설정해 덮어쓰기 권장
 * (예: REACT_APP_API_URL=http://54.180.152.247:8000)
 * ==================================================== */
const API_BASE = process.env.REACT_APP_API_URL || '';

/* ====================================================
 * 감정 → 이모지 / 색상 / 한글 라벨 매핑
 * 백엔드 응답의 emotion_key(영문)와 1:1 대응
 * ==================================================== */
const EMOTION_META = {
  joy:      { emoji: '😊', label: '기쁨',   colorVar: 'var(--emotion-joy)' },
  sadness:  { emoji: '😢', label: '슬픔',   colorVar: 'var(--emotion-sadness)' },
  anger:    { emoji: '😠', label: '분노',   colorVar: 'var(--emotion-anger)' },
  fear:     { emoji: '😨', label: '두려움', colorVar: 'var(--emotion-fear)' },
  trust:    { emoji: '🙂', label: '신뢰',   colorVar: 'var(--emotion-trust)' },
  surprise: { emoji: '😲', label: '놀람',   colorVar: 'var(--emotion-surprise)' },
  unknown:  { emoji: '·',  label: '기록 없음', colorVar: 'var(--emotion-unknown)' },
};

/* 한글 primary_emotion → 영문 키 (emotion_key 누락 시 fallback) */
const KOR_TO_KEY = {
  '기쁨': 'joy',
  '슬픔': 'sadness',
  '분노': 'anger',
  '두려움': 'fear',
  '신뢰': 'trust',
  '놀람': 'surprise',
  '알수없음': 'unknown',
};

/* 날씨 코드 → 이모지 (백엔드 weather 필드 시각화용) */
const WEATHER_EMOJI = {
  SUNNY: '☀️',
  CLOUDY: '☁️',
  RAINY: '🌧️',
  SNOWY: '❄️',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
];

function Calendar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  /* diaryMap 구조:
   * {
   *   'YYYY-MM-DD': {
   *     diary_id: number,
   *     weather: string,
   *     primary_emotion: string (한글),
   *     emotion_key: string (영문),
   *     preview: string,
   *   }
   * }
   */
  const [diaryMap, setDiaryMap] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /* ====================================================
   * 월별 일기/감정 데이터 fetch
   * GET /api/diary/calendar/?year=YYYY&month=M
   * 응답:
   * {
   *   has_diaries: boolean,
   *   year: number,
   *   month: number,
   *   calendar_data: { 'YYYY-MM-DD': { diary_id, weather, primary_emotion, emotion_key, preview } }
   * }
   * ==================================================== */
  useEffect(() => {
    const controller = new AbortController();

    const fetchMonthlyEmotions = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('로그인이 필요합니다.');
          setDiaryMap({});
          return;
        }

        const response = await axios.get(`${API_BASE}/api/diary/calendar/`, {
          params: { year, month: month + 1 }, // JS month는 0-indexed → 백엔드는 1-indexed
          headers: { Authorization: `Token ${token}` },
          signal: controller.signal,
        });

        const { has_diaries, calendar_data } = response.data;

        // 해당 월에 일기가 하나도 없으면 빈 맵으로 처리
        if (!has_diaries || !calendar_data) {
          setDiaryMap({});
          return;
        }

        // emotion_key가 누락된 응답을 대비해 한글 라벨 fallback 매핑
        const normalized = {};
        Object.entries(calendar_data).forEach(([dateKey, entry]) => {
          const emotionKey =
            entry.emotion_key ||
            KOR_TO_KEY[entry.primary_emotion] ||
            'unknown';
          normalized[dateKey] = { ...entry, emotion_key: emotionKey };
        });
        setDiaryMap(normalized);
      } catch (err) {
        // AbortController로 인한 취소는 무시
        if (axios.isCancel(err) || err.name === 'CanceledError') return;

        console.error('월별 감정 데이터 로딩 실패', err);

        if (err.response?.status === 401) {
          setError('로그인이 만료되었어요. 다시 로그인해주세요.');
          // 선택: 자동 로그아웃 + 리다이렉트
          // localStorage.removeItem('token');
          // logout();
          // navigate('/login');
        } else if (err.response?.status === 400) {
          setError('잘못된 요청이에요. 날짜를 확인해주세요.');
        } else {
          setError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
        }
        setDiaryMap({});
      } finally {
        setIsLoading(false);
      }
    };

    fetchMonthlyEmotions();

    // cleanup: 빠른 월 이동 시 이전 요청 취소
    return () => controller.abort();
  }, [year, month]);

  /* ====================================================
   * 달력 그리드 (6주 × 7일 = 42칸)
   * ==================================================== */
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const cells = [];

    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({ day: prevMonthLastDay - i, type: 'prev', dateKey: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, type: 'current', dateKey });
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, type: 'next', dateKey: null });
    }
    return cells;
  }, [year, month]);

  /* ====================================================
   * 월간 감정 통계 (Top 3)
   * ==================================================== */
  const monthlyStats = useMemo(() => {
    const counts = {};
    Object.values(diaryMap).forEach((entry) => {
      const key = entry.emotion_key || 'unknown';
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);
    return { sorted, total };
  }, [diaryMap]);

  /* ====================================================
   * 핸들러
   * ==================================================== */
  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () =>
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const handleDateClick = (cell) => {
    if (cell.type !== 'current') return;

    const cellDate = new Date(year, month, cell.day);
    if (cellDate > today) return;

    const entry = diaryMap[cell.dateKey];
    if (entry) {
      // 일기 + 추천 컨텐츠 페이지로 이동 (diary_id 함께 전달)
      navigate('/recommended', {
        state: {
          date: cell.dateKey,
          diary_id: entry.diary_id,
        },
      });
    } else {
      // 일기가 없는 날짜 → 일기 작성 페이지로
      // navigate(`/diary/write?date=${cell.dateKey}`);
      navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/logout/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
    } catch (err) {
      console.error('로그아웃 요청 실패', err);
    }
    localStorage.removeItem('token');
    logout();
    navigate('/login');
  };

  /* ====================================================
   * 오늘 날짜 계산
   * ==================================================== */
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isCurrentMonthView =
    year === today.getFullYear() && month === today.getMonth();
  const hasTodayDiary = isCurrentMonthView && !!diaryMap[todayKey];

  return (
    <div className={styles.page}>
      {/* ───── 상단 네비게이션 ───── */}
      <nav className={styles.topnav}>
        <div className={styles.topnavLeft}>
          <span className={styles.topnavLogo}>Day by Day</span>
        </div>
        <div className={styles.topnavRight}>
          <button className={styles.topnavLink} onClick={() => navigate('/')}>홈</button>
          <button className={styles.topnavLink} onClick={() => navigate('/recommended')}>추천</button>
          {user && (
            <button
              className={`${styles.topnavLink} ${styles.topnavLogout}`}
              onClick={handleLogout}
            >
              로그아웃
            </button>
          )}
        </div>
      </nav>

      {/* ───── 메인 콘텐츠 ───── */}
      <main className={styles.main}>
        {/* 인사 영역 */}
        <header className={styles.greeting}>
          <p className={styles.greetingSub}>
            {user ? `${user.username}님의 마음 기록` : '나의 마음 기록'}
          </p>
          <h1 className={styles.greetingTitle}>감정 캘린더</h1>
        </header>

        {/* 에러 배너 */}
        {error && (
          <div className={styles.errorBanner} role="alert">
            <span className={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 캘린더 카드 */}
        <section className={styles.calendarCard}>
          {/* 캘린더 헤더 */}
          <div className={styles.calendarHeader}>
            <button
              className={styles.navButton}
              onClick={handlePrevMonth}
              aria-label="이전 달"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            <div className={styles.calendarTitle}>
              <span className={styles.calendarYear}>{year}</span>
              <span className={styles.calendarMonth}>{MONTH_LABELS[month]}</span>
            </div>

            <button
              className={styles.navButton}
              onClick={handleNextMonth}
              aria-label="다음 달"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>

          {/* 오늘로 가기 + CTA */}
          <div className={styles.subActions}>
            {!isCurrentMonthView && (
              <button className={styles.todayButton} onClick={handleToday}>
                오늘로 돌아가기
              </button>
            )}
            {isCurrentMonthView && !hasTodayDiary && !isLoading && (
              <button className={styles.writeCta} onClick={() => navigate('/')}>
                ✍️  오늘의 일기 쓰기
              </button>
            )}
            {isCurrentMonthView && hasTodayDiary && (
              <span className={styles.todayDone}>오늘 기록 완료 ✓</span>
            )}
          </div>

          {/* 요일 헤더 */}
          <div className={styles.weekdays}>
            {WEEKDAYS.map((d, i) => (
              <div
                key={i}
                className={`${styles.weekday} ${i === 0 ? styles.weekdaySun : ''} ${i === 6 ? styles.weekdaySat : ''}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 (로딩 시 흐려짐 + 스피너 오버레이) */}
          <div className={`${styles.gridWrap} ${isLoading ? styles.gridLoading : ''}`}>
            <div className={styles.grid}>
              {calendarCells.map((cell, idx) => {
                const entry = cell.dateKey ? diaryMap[cell.dateKey] : null;
                const emotionKey = entry?.emotion_key;
                const meta = emotionKey ? EMOTION_META[emotionKey] : null;
                const weatherEmoji = entry?.weather ? WEATHER_EMOJI[entry.weather] : null;
                const isToday = cell.dateKey === todayKey;
                const cellDate =
                  cell.type === 'current' ? new Date(year, month, cell.day) : null;
                const isFuture = cellDate && cellDate > today;
                const dayOfWeek = idx % 7;

                return (
                  <button
                    key={idx}
                    className={`
                      ${styles.cell}
                      ${cell.type !== 'current' ? styles.cellMuted : ''}
                      ${isToday ? styles.cellToday : ''}
                      ${isFuture ? styles.cellFuture : ''}
                      ${meta ? styles.cellHasEmotion : ''}
                    `}
                    onClick={() => handleDateClick(cell)}
                    disabled={cell.type !== 'current' || isFuture}
                    aria-label={
                      cell.dateKey
                        ? `${cell.day}일${meta ? `, 감정: ${meta.label}` : ', 기록 없음'}`
                        : ''
                    }
                  >
                    {meta && (
                      <span
                        className={styles.emotionBlob}
                        style={{ background: meta.colorVar }}
                      >
                        <span className={styles.emotionEmoji}>{meta.emoji}</span>
                      </span>
                    )}
                    <span
                      className={`
                        ${styles.dayNumber}
                        ${dayOfWeek === 0 ? styles.daySun : ''}
                        ${dayOfWeek === 6 ? styles.daySat : ''}
                      `}
                    >
                      {cell.day}
                    </span>
                    {meta && entry && (
                      <span className={styles.tooltip}>
                        <span className={styles.tooltipHeader}>
                          {weatherEmoji && <span>{weatherEmoji}</span>}
                          <span>{meta.label}</span>
                        </span>
                        {entry.preview && (
                          <span className={styles.tooltipPreview}>
                            {entry.preview}
                          </span>
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {isLoading && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
              </div>
            )}
          </div>
        </section>

        {/* ───── 월간 통계 패널 ───── */}
        <section className={styles.statsCard}>
          <div className={styles.statsHeader}>
            <h2 className={styles.statsTitle}>이번 달 감정 흐름</h2>
            <span className={styles.statsCount}>
              총 {monthlyStats.total}개의 기록
            </span>
          </div>

          {monthlyStats.sorted.length > 0 ? (
            <ul className={styles.statsList}>
              {monthlyStats.sorted.map(([key, count], idx) => {
                const meta = EMOTION_META[key] || EMOTION_META.unknown;
                const percentage = Math.round((count / monthlyStats.total) * 100);
                return (
                  <li key={key} className={styles.statsItem}>
                    <span className={styles.statsRank}>{idx + 1}</span>
                    <span
                      className={styles.statsBlob}
                      style={{ background: meta.colorVar }}
                    >
                      {meta.emoji}
                    </span>
                    <div className={styles.statsBarWrap}>
                      <div className={styles.statsLabelRow}>
                        <span className={styles.statsLabel}>{meta.label}</span>
                        <span className={styles.statsPercent}>{percentage}%</span>
                      </div>
                      <div className={styles.statsBar}>
                        <div
                          className={styles.statsBarFill}
                          style={{
                            width: `${percentage}%`,
                            background: meta.colorVar,
                          }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className={styles.statsEmpty}>
              {isLoading
                ? '데이터를 불러오는 중이에요…'
                : '아직 이번 달 기록이 없어요. 첫 일기를 남겨보세요 🌱'}
            </p>
          )}
        </section>

        {/* ───── 감정 범례 ───── */}
        <section className={styles.legend}>
          <h3 className={styles.legendTitle}>감정 가이드</h3>
          <div className={styles.legendGrid}>
            {Object.entries(EMOTION_META)
              .filter(([key]) => key !== 'unknown')
              .map(([key, meta]) => (
                <div key={key} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ background: meta.colorVar }}
                  >
                    {meta.emoji}
                  </span>
                  <span className={styles.legendLabel}>{meta.label}</span>
                </div>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Calendar;