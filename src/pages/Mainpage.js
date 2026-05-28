import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './Mainpage.module.css';

// ─── API Base (.env에서 주입, 배포 시 빈 문자열 → Netlify 프록시) ───
const API_BASE = process.env.REACT_APP_API_URL || '';

// ─── 감정 → 이모지 / 색상 / 한글 라벨 매핑 (캘린더와 동일) ───
const EMOTION_META = {
  joy:      { emoji: '😊', label: '기쁨',   color: '#FBBF77' }, // 따뜻한 머스타드
  sadness:  { emoji: '😢', label: '슬픔',   color: '#6FA8DC' }, // 차분한 세룰리안
  anger:    { emoji: '😠', label: '분노',   color: '#E89090' }, // 옅은 코랄
  fear:     { emoji: '😨', label: '두려움', color: '#B5A8D9' }, // 라벤더 그레이
  trust:    { emoji: '🙂', label: '신뢰',   color: '#9BC4A5' }, // 세이지 그린
  surprise: { emoji: '😲', label: '놀람',   color: '#F5C7B8' }, // 살구 핑크
};

// 한글 primary_emotion → 영문 키 (emotion_key 누락 시 fallback)
const KOR_TO_KEY = {
  '기쁨': 'joy',
  '슬픔': 'sadness',
  '분노': 'anger',
  '두려움': 'fear',
  '신뢰': 'trust',
  '놀람': 'surprise',
  '알수없음': 'unknown',
};

// ─── 날씨 코드 → 이모지 (캘린더와 동일) ───
const WEATHER_EMOJI = {
  SUNNY: '☀️',
  CLOUDY: '☁️',
  RAINY: '🌧️',
  SNOWY: '❄️',
  THUNDER: '⛈️',
};

// ─── 유틸: 시간대별 인사말 & 이모지 ───
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: '좋은 아침이에요', emoji: '☀️' };
  if (hour >= 12 && hour < 18) return { text: '좋은 오후예요', emoji: '🌤️' };
  if (hour >= 18 && hour < 22) return { text: '좋은 저녁이에요', emoji: '🌙' };
  return { text: '늦은 밤이에요', emoji: '🌙' };
}

// ─── 유틸: 오늘 날짜 포맷 ───
function getFormattedDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const date = now.getDate();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const day = days[now.getDay()];
  return `${year}. ${month}. ${date}. ${day}요일`;
}

// ─── 유틸: 로컬 기준 YYYY-MM-DD 키 생성 (UTC 변환 오류 방지) ───
function toDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

// ─── 유틸: 이번 주 날짜 배열 (월~일) ───
function getWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const labels = ['월', '화', '수', '목', '금', '토', '일'];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    const isPast = d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
      label,
      date: d.getDate(),
      dateKey: toDateKey(d), // 'YYYY-MM-DD' — moodData 조회 키
      isToday,
      isPast,
    };
  });
}

// ═══════════════════════════════════════
//  컴포넌트: 상단 네비게이션 바
// ═══════════════════════════════════════
function TopNav({ user, onLogout, onNavigate }) {
  return (
    <nav className={styles.topnav}>
      <div className={styles.topnavLeft}>
        <span className={styles.topnavLogo}>Day by Day</span>
      </div>
      <div className={styles.topnavRight}>
        <button className={styles.topnavLink} onClick={() => onNavigate('/calendar')}>캘린더</button>
        <button className={styles.topnavLink} onClick={() => onNavigate('/recommended')}>추천 보관함</button>
        {user ? (
          <button className={`${styles.topnavLink} ${styles.topnavLogout}`} onClick={onLogout}>로그아웃</button>
        ) : (
          <button className={styles.topnavLink} onClick={() => onNavigate('/login')}>로그인</button>
        )}
      </div>
    </nav>
  );
}

// ═══════════════════════════════════════
//  컴포넌트: 히어로 섹션 (인사말 + CTA)
// ═══════════════════════════════════════
function HeroSection({ user, onStartDiary }) {
  const greeting = getGreeting();
  const dateStr = getFormattedDate();
  const displayName = user ? user.username : '방문자';

  return (
    <section className={styles.heroSection}>
      <p className={styles.heroDate}>{dateStr}</p>
      <h1 className={styles.heroGreeting}>
        {greeting.text}, {displayName} 님 {greeting.emoji}
      </h1>

      <div className={styles.heroCard}>
        <p className={styles.heroCardText}>오늘은 어떤 하루였나요?</p>
        <button className={styles.heroCta} onClick={onStartDiary}>
          ✍️ 기록 시작하기
        </button>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
//  컴포넌트: 이번 주 마음 흐름
//  moodData: { 'YYYY-MM-DD': { emotion_key, emoji, label, color, weather, preview } }
// ═══════════════════════════════════════
function WeeklyMood({ weekDates, moodData, isLoading }) {
  // 날짜별 표시 방식 결정
  const getMoodStyle = (dateInfo) => {
    const entry = moodData[dateInfo.dateKey];

    // 1) 일기가 있는 날 → 감정 이모지 블롭
    if (entry) {
      return { type: 'emotion', ...entry };
    }
    // 2) 오늘인데 아직 기록 없음 → 점선 원 (작성 유도)
    if (dateInfo.isToday) {
      return { type: 'empty' };
    }
    // 3) 지나간 날인데 기록 없음 → 옅은 빈 원
    if (dateInfo.isPast) {
      return { type: 'missing' };
    }
    // 4) 아직 오지 않은 미래 → 작은 점
    return { type: 'none' };
  };

  return (
    <section className={styles.weeklyMood}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionLine} />
        이번 주 마음 흐름
        <span className={styles.sectionLine} />
      </h2>

      <div className={`${styles.moodRow} ${isLoading ? styles.moodLoading : ''}`}>
        {weekDates.map((d, i) => {
          const mood = getMoodStyle(d);
          const weatherEmoji = mood.weather ? WEATHER_EMOJI[mood.weather] : null;
          return (
            <div
              key={i}
              className={`${styles.moodItem} ${d.isToday ? styles.moodToday : ''}`}
            >
              <span className={styles.moodLabel}>{d.label}</span>
              <div className={styles.moodDotWrapper}>
                {mood.type === 'emotion' && (
                  <span
                    className={styles.moodEmotion}
                    style={{ backgroundColor: mood.color }}
                  >
                    <span className={styles.moodEmoji}>{mood.emoji}</span>
                  </span>
                )}
                {mood.type === 'empty' && (
                  <span className={`${styles.moodDot} ${styles.moodEmpty}`} />
                )}
                {mood.type === 'missing' && (
                  <span className={`${styles.moodDot} ${styles.moodMissing}`} />
                )}
                {mood.type === 'none' && (
                  <span className={`${styles.moodDot} ${styles.moodNone}`} />
                )}

                {/* 일기가 있는 날 → 호버 시 감정 + 미리보기 툴팁 (캘린더와 동일) */}
                {mood.type === 'emotion' && (
                  <span className={styles.tooltip}>
                    <span className={styles.tooltipHeader}>
                      {weatherEmoji && <span>{weatherEmoji}</span>}
                      <span>{mood.label}</span>
                    </span>
                    {mood.preview && (
                      <span className={styles.tooltipPreview}>
                        {mood.preview}
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
//  컴포넌트: 오늘 추천받은 콘텐츠
// ═══════════════════════════════════════
function RecommendedPreview({ items, onNavigate }) {
  const dummyItems = items.length > 0 ? items : [
    { type: '🎬', title: '추천 영화가 아직 없어요', thumbnail: null, id: null },
    { type: '🎵', title: '추천 음악이 아직 없어요', thumbnail: null, id: null },
    { type: '📖', title: '추천 책이 아직 없어요', thumbnail: null, id: null },
  ];

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionSubtitle}>🎁 오늘 추천받은 콘텐츠</h2>
        <button className={styles.linkBtn} onClick={() => onNavigate('/recommended')}>
          모두 보기 →
        </button>
      </div>
      <div className={styles.recommendedScroll}>
        {dummyItems.map((item, i) => (
          <div key={i} className={styles.recommendedCard}>
            <div className={styles.recommendedThumbnail}>
              {item.thumbnail ? (
                <img src={item.thumbnail} alt={item.title} />
              ) : (
                <span className={styles.recommendedPlaceholder}>{item.type}</span>
              )}
            </div>
            <p className={styles.recommendedTitle}>{item.title}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
//  컴포넌트: 최근 일기 목록
// ═══════════════════════════════════════
function RecentDiaries({ diaries, onNavigate }) {
  const dummyDiaries = diaries.length > 0 ? diaries : [
    { id: 1, date: '5/14', weather: '🌧', mood: '차분함', preview: '오늘은 비가 와서 집에서 조용히...' },
    { id: 2, date: '5/13', weather: '☀️', mood: '활기참', preview: '날씨가 좋아서 산책을 했다...' },
  ];

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionSubtitle}>최근 일기</h2>
        <button className={styles.linkBtn} onClick={() => onNavigate('/calendar')}>
          모두 보기 →
        </button>
      </div>
      <div className={styles.diaryList}>
        {dummyDiaries.map((diary) => (
          <div key={diary.id} className={styles.diaryCard}>
            <div className={styles.diaryMeta}>
              <span className={styles.diaryDate}>{diary.date}</span>
              <span className={styles.diaryWeather}>{diary.weather}</span>
              <span className={styles.diaryMoodTag}>{diary.mood}</span>
            </div>
            <p className={styles.diaryPreview}>"{diary.preview}"</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
//  메인 페이지
// ═══════════════════════════════════════
function Mainpage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [recommendedItems, setRecommendedItems] = useState([]);
  const [recentDiaries, setRecentDiaries] = useState([]);
  const [moodData, setMoodData] = useState({});       // { 'YYYY-MM-DD': { emotion_key, label, color } }
  const [moodLoading, setMoodLoading] = useState(false);

  const weekDates = getWeekDates();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_BASE}/api/logout/`,
        {},
        { headers: { Authorization: `Token ${token}` } }
      );
    } catch (error) {
      console.error('로그아웃 요청 실패', error);
    }
    localStorage.removeItem('token');
    logout();
    navigate('/login');
  };

  const handleStartDiary = () => {
    // TODO: 일기 작성 페이지/모달로 이동
    navigate('/diary/write');
  };

  // ─────────────────────────────────────
  //  이번 주 마음 흐름: 캘린더 API 재사용
  //  GET /api/diary/calendar/?year=&month=
  //  이번 주가 두 달에 걸치면 두 달 모두 조회 후 병합
  // ─────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const fetchWeeklyMood = async () => {
      const token = localStorage.getItem('token');
      if (!token) return; // 비로그인 시 더미/빈 상태 유지

      setMoodLoading(true);

      try {
        // 이번 주에 걸친 (year, month) 조합을 중복 없이 수집
        const monthKeys = new Map(); // 'YYYY-M' → { year, month }
        weekDates.forEach((d) => {
          const [y, m] = d.dateKey.split('-');
          const key = `${parseInt(y, 10)}-${parseInt(m, 10)}`;
          if (!monthKeys.has(key)) {
            monthKeys.set(key, { year: parseInt(y, 10), month: parseInt(m, 10) });
          }
        });

        // 각 달을 병렬 조회
        const requests = Array.from(monthKeys.values()).map(({ year, month }) =>
          axios.get(`${API_BASE}/api/diary/calendar/`, {
            params: { year, month }, // dateKey에서 이미 1-indexed로 추출됨
            headers: { Authorization: `Token ${token}` },
            signal: controller.signal,
          })
        );

        const responses = await Promise.all(requests);

        // 이번 주 날짜 집합 (빠른 조회용)
        const weekKeySet = new Set(weekDates.map((d) => d.dateKey));

        // 응답들을 병합하면서 이번 주 날짜만 추출
        const merged = {};
        responses.forEach((res) => {
          const { has_diaries, calendar_data } = res.data;
          if (!has_diaries || !calendar_data) return;

          Object.entries(calendar_data).forEach(([dateKey, entry]) => {
            if (!weekKeySet.has(dateKey)) return; // 이번 주 밖 날짜는 버림

            const emotionKey =
              entry.emotion_key ||
              KOR_TO_KEY[entry.primary_emotion] ||
              'unknown';
            const meta = EMOTION_META[emotionKey];
            if (!meta) return; // unknown 등 매핑 없는 감정은 표시 안 함

            merged[dateKey] = {
              emotion_key: emotionKey,
              emoji: meta.emoji,
              label: meta.label,
              color: meta.color,
              weather: entry.weather || null,
              preview: entry.preview || '',
            };
          });
        });

        setMoodData(merged);
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') return;
        console.error('이번 주 마음 흐름 로딩 실패', err);
        // 실패 시 빈 상태로 둠 (UI는 '기록 없음'으로 표시)
        setMoodData({});
      } finally {
        setMoodLoading(false);
      }
    };

    fetchWeeklyMood();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 마운트 시 1회 (이번 주는 고정)

  // ─────────────────────────────────────
  //  추천 콘텐츠 / 최근 일기 (추후 연동)
  // ─────────────────────────────────────
  useEffect(() => {
    // TODO: 백엔드 연동 시 아래 주석 해제
    // fetchRecommended(); fetchDiaries();
  }, []);

  return (
    <div className={styles.mainpage}>
      <TopNav user={user} onLogout={handleLogout} onNavigate={navigate} />

      <main className={styles.mainContent}>
        <HeroSection user={user} onStartDiary={handleStartDiary} />
        <WeeklyMood weekDates={weekDates} moodData={moodData} isLoading={moodLoading} />
        <RecommendedPreview items={recommendedItems} onNavigate={navigate} />
        <RecentDiaries diaries={recentDiaries} onNavigate={navigate} />
      </main>

      <footer className={styles.mainFooter}>
        <p>© 2026 Day by Day</p>
        <p>Developed by 이현욱 정종욱 구민주 설소연</p>
      </footer>
    </div>
  );
}

export default Mainpage;