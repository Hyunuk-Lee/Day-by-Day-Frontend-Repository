import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
// import axios from 'axios';
import styles from './Calendar.module.css';

/* ====================================================
 * 감정 → 이모지 / 색상 / 한글 라벨 매핑
 * services.py의 primary_emotion 값 6종(+ 알수없음)에 대응
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

// 한글 primary_emotion → 영문 키 역매핑 (백엔드 응답 호환용)
const KOR_TO_KEY = {
  '기쁨': 'joy',
  '슬픔': 'sadness',
  '분노': 'anger',
  '두려움': 'fear',
  '신뢰': 'trust',
  '놀람': 'surprise',
  '알수없음': 'unknown',
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LABELS = [
  '1월', '2월', '3월', '4월', '5월', '6월',
  '7월', '8월', '9월', '10월', '11월', '12월'
];

/* ====================================================
 * 임시 더미 데이터
 * 백엔드 연동 전, UI 검증을 위해 사용
 * key: 'YYYY-MM-DD', value: primary_emotion 영문 키
 * ==================================================== */
const generateMockData = (year, month) => {
  const mock = {};
  const emotions = ['joy', 'sadness', 'anger', 'fear', 'trust', 'surprise'];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // 약 65% 정도의 날짜에 랜덤 감정 부여
  for (let d = 1; d <= daysInMonth; d++) {
    if (Math.random() > 0.35) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      mock[key] = emotions[Math.floor(Math.random() * emotions.length)];
    }
  }
  return mock;
};

function Calendar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [diaryMap, setDiaryMap] = useState({});
  // const [isLoading, setIsLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  /* ====================================================
   * 월 변경 시 해당 월의 일기/감정 데이터 fetch
   * 현재는 더미 데이터, 추후 API 연동 시 주석 해제
   * ==================================================== */
  useEffect(() => {
    // ===== 추후 백엔드 연동 시 사용할 코드 =====
    // const fetchMonthlyEmotions = async () => {
    //   setIsLoading(true);
    //   try {
    //     const token = localStorage.getItem('token');
    //     const response = await axios.get(
    //       `/api/diaries/emotions/?year=${year}&month=${month + 1}`,
    //       { headers: { Authorization: `Token ${token}` } }
    //     );
    //     // 예상 응답 형식: [{ date: '2026-05-01', primary_emotion: '기쁨' }, ...]
    //     const map = {};
    //     response.data.forEach(item => {
    //       const key = KOR_TO_KEY[item.primary_emotion] || 'unknown';
    //       map[item.date] = key;
    //     });
    //     setDiaryMap(map);
    //   } catch (error) {
    //     console.error('월별 감정 데이터 로딩 실패', error);
    //   } finally {
    //     setIsLoading(false);
    //   }
    // };
    // fetchMonthlyEmotions();

    // ===== 임시: 더미 데이터 사용 =====
    setDiaryMap(generateMockData(year, month));
  }, [year, month]);

  /* ====================================================
   * 달력 그리드 계산 (이전/다음 달 빈칸 포함 6주 그리드)
   * ==================================================== */
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const startWeekday = firstDayOfMonth.getDay(); // 0(일) ~ 6(토)
    const daysInMonth = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const cells = [];

    // 이전 달 잔여 (흐릿 표시)
    for (let i = startWeekday - 1; i >= 0; i--) {
      cells.push({
        day: prevMonthLastDay - i,
        type: 'prev',
        dateKey: null,
      });
    }

    // 이번 달
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        day: d,
        type: 'current',
        dateKey,
      });
    }

    // 다음 달 채움 (총 42칸 = 6주)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        type: 'next',
        dateKey: null,
      });
    }

    return cells;
  }, [year, month]);

  /* ====================================================
   * 월간 감정 통계 (Top 3)
   * ==================================================== */
  const monthlyStats = useMemo(() => {
    const counts = {};
    Object.values(diaryMap).forEach(emotion => {
      counts[emotion] = (counts[emotion] || 0) + 1;
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
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleDateClick = (cell) => {
    if (cell.type !== 'current') return;
    // 미래 날짜는 클릭 비활성화
    const cellDate = new Date(year, month, cell.day);
    if (cellDate > today) return;

    // 일기가 있는 날짜만 추천 페이지로 이동
    if (diaryMap[cell.dateKey]) {
      // ===== 추후 라우팅 시 사용할 코드 =====
      // navigate(`/recommended/${cell.dateKey}`);
      navigate('/recommended', { state: { date: cell.dateKey } });
    } else {
      // 일기가 없는 날짜 → 일기 작성 페이지로
      // navigate(`/diary/write?date=${cell.dateKey}`);
      navigate('/');
    }
  };

  const handleLogout = async () => {
    try {
      // const token = localStorage.getItem('token');
      // await axios.post(
      //   '/api/logout/',
      //   {},
      //   { headers: { Authorization: `Token ${token}` } }
      // );
    } catch (error) {
      console.error('로그아웃 요청 실패', error);
    }
    localStorage.removeItem('token');
    logout();
    navigate('/login');
  };

  /* ====================================================
   * 오늘 날짜 비교용 키
   * ==================================================== */
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const isCurrentMonthView = year === today.getFullYear() && month === today.getMonth();
  const hasTodayDiary = isCurrentMonthView && diaryMap[todayKey];

  return (
    <div className={styles.page}>
      {/* ───── 상단 네비게이션 ───── */}
      <nav className={styles.topnav}>
        <div className={styles.topnavLeft}>
          <span className={styles.topnavLogo}>Day by Day</span>
        </div>
        <div className={styles.topnavRight}>
          <button className={styles.topnavLink} onClick={() => navigate('/')}>홈</button>
          <button className={styles.topnavLink} onClick={() => navigate('/recommended')}>추천 보관함</button>
          {user && (
            <button className={`${styles.topnavLink} ${styles.topnavLogout}`} onClick={handleLogout}>
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
            {isCurrentMonthView && !hasTodayDiary && (
              <button className={styles.writeCta} onClick={() => navigate('/diary/write')}>
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

          {/* 날짜 그리드 */}
          <div className={styles.grid}>
            {calendarCells.map((cell, idx) => {
              const emotionKey = cell.dateKey ? diaryMap[cell.dateKey] : null;
              const meta = emotionKey ? EMOTION_META[emotionKey] : null;
              const isToday = cell.dateKey === todayKey;
              const cellDate = cell.type === 'current' ? new Date(year, month, cell.day) : null;
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
                  {meta && (
                    <span className={styles.tooltip}>{meta.label}</span>
                  )}
                </button>
              );
            })}
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
                const meta = EMOTION_META[key];
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
              아직 이번 달 기록이 없어요. 첫 일기를 남겨보세요 🌱
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