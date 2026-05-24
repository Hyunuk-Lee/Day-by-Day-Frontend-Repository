import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './Mainpage.module.css';

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
    return { label, date: d.getDate(), isToday, isPast };
  });
}

// ═══════════════════════════════════════
//  컴포넌트: 상단 네비게이션 바
// ═══════════════════════════════════════
function TopNav({ user, onLogout, onNavigate }) {
  return (
    <nav className={styles.topnav}>
      <div className={styles.topnavLeft}>
        <button className={styles.topnavMenuBtn} aria-label="메뉴">☰</button>
        <span className={styles.topnavLogo}>Day by Day</span>
      </div>
      <div className={styles.topnavRight}>
        <button className={styles.topnavLink} onClick={() => onNavigate('/calendar')}>캘린더</button>
        <button className={styles.topnavLink} onClick={() => onNavigate('/recommended')}>추천 보관함</button>
        <button className={styles.topnavLink} onClick={() => onNavigate('/Mypage')}>마이페이지</button>
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
// ═══════════════════════════════════════
function WeeklyMood({ weekDates, moodData }) {
  const getMoodStyle = (dateInfo) => {
    if (!dateInfo.isPast && !dateInfo.isToday) {
      return { type: 'none' };
    }
    if (dateInfo.isToday) {
      return { type: 'empty', color: '#ccc' };
    }
    // 더미 데이터 — 백엔드 연동 시 moodData로 교체
    const colors = ['#7EB8DA', '#F4A261', '#90BE6D', '#C77DFF', '#F28482'];
    const types = ['full', 'full', 'half', 'full', 'full'];
    const idx = dateInfo.date % colors.length;
    return { type: types[idx], color: colors[idx] };
  };

  return (
    <section className={styles.weeklyMood}>
      <h2 className={styles.sectionTitle}>
        <span className={styles.sectionLine} />
        이번 주 마음 흐름
        <span className={styles.sectionLine} />
      </h2>
      <div className={styles.moodRow}>
        {weekDates.map((d, i) => {
          const mood = getMoodStyle(d);
          return (
            <div key={i} className={`${styles.moodItem} ${d.isToday ? styles.moodToday : ''}`}>
              <span className={styles.moodLabel}>{d.label}</span>
              <div className={styles.moodDotWrapper}>
                {mood.type === 'full' && (
                  <span
                    className={`${styles.moodDot} ${styles.moodFull}`}
                    style={{ backgroundColor: mood.color }}
                  />
                )}
                {mood.type === 'half' && (
                  <span
                    className={`${styles.moodDot} ${styles.moodHalf}`}
                    style={{ borderColor: mood.color, backgroundColor: `${mood.color}55` }}
                  />
                )}
                {mood.type === 'empty' && (
                  <span className={`${styles.moodDot} ${styles.moodEmpty}`} />
                )}
                {mood.type === 'none' && (
                  <span className={`${styles.moodDot} ${styles.moodNone}`} />
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
  const [moodData, setMoodData] = useState({});

  const weekDates = getWeekDates();

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        '/api/logout/',
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

  useEffect(() => {
    // TODO: 백엔드 연동 시 아래 주석 해제
    // fetchRecommended(); fetchDiaries(); fetchMood();
  }, []);

  return (
    <div className={styles.mainpage}>
      <TopNav user={user} onLogout={handleLogout} onNavigate={navigate} />

      <main className={styles.mainContent}>
        <HeroSection user={user} onStartDiary={handleStartDiary} />
        <WeeklyMood weekDates={weekDates} moodData={moodData} />
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