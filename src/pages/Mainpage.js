import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';                  // ← 공유 axios 인스턴스
import styles from './Mainpage.module.css';

// ─── 유틸: 시간대별 인사말 ───
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: '좋은 아침이에요', emoji: '☀️' };
  if (hour >= 12 && hour < 18) return { text: '좋은 오후예요', emoji: '🌤️' };
  if (hour >= 18 && hour < 22) return { text: '좋은 저녁이에요', emoji: '🌙' };
  return { text: '늦은 밤이에요', emoji: '🌙' };
}

function getFormattedDate() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${days[now.getDay()]}요일`;
}

function formatDateForAPI(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatShortDate(isoString) {
  const d = new Date(isoString);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

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
    d.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      label,
      date: d.getDate(),
      fullDate: d,
      isToday: d.getTime() === today.getTime(),
      isPast: d < today,
    };
  });
}

const EMOTION_META = {
  '기쁨': { emoji: '😊', color: '#FCD34D' },
  '슬픔': { emoji: '😢', color: '#93C5FD' },
  '분노': { emoji: '😠', color: '#FCA5A5' },
  '공포': { emoji: '😨', color: '#C4B5FD' },
  '신뢰': { emoji: '😌', color: '#86EFAC' },
  '놀람': { emoji: '😲', color: '#FDBA74' },
};

function getEmotionMeta(primaryEmotion) {
  return EMOTION_META[primaryEmotion] || { emoji: '🌙', color: '#CBD5E1' };
}

const WEATHER_EMOJI = {
  SUNNY: '☀️', CLOUDY: '⛅', RAINY: '🌧',
  SNOWY: '❄️', WINDY: '💨', THUNDER: '⛈',
};

function getWeatherEmoji(weather) {
  return WEATHER_EMOJI[weather] || '';
}

function parseMovieTags(tags) {
  if (!tags || tags.length === 0) return [];
  const first = tags[0];
  if (typeof first === 'string' && first.trim().startsWith('[')) {
    try {
      return JSON.parse(first.replace(/'/g, '"'));
    } catch {
      return tags;
    }
  }
  return tags;
}

// ─── 유틸: 공감 멘트에서 마지막 문장(추천 안내) 제거 ───
function stripRecommendationSentence(message) {
  if (!message) return message;
  const lastDot = message.lastIndexOf('.');
  if (lastDot === -1) return message;                 // 마침표가 없으면 그대로
  const secondLastDot = message.lastIndexOf('.', lastDot - 1);
  if (secondLastDot === -1) return message;           // 문장이 하나뿐이면 그대로
  return message.slice(0, secondLastDot + 1);         // 마지막에서 두 번째 '.'까지만 남김
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
//  컴포넌트: 히어로 섹션 (공감 멘트 우선)
// ═══════════════════════════════════════
function HeroSection({ user, todayDiary, empathy, onStartDiary, onViewToday }) {
  const greeting = getGreeting();
  const dateStr = getFormattedDate();
  const displayName = user ? user.username : '방문자';
  const hasToday = !!todayDiary;
  const hasEmpathy = !!(empathy?.has_diaries && empathy?.empathy_message);

  return (
    <section className={styles.heroSection}>
      <p className={styles.heroDate}>{dateStr}</p>
      <h1 className={styles.heroGreeting}>
        {greeting.text}, {displayName} 님 {greeting.emoji}
      </h1>

      <div className={styles.heroCard}>
        {hasEmpathy ? (
          <div className={styles.empathyBlock}>
            <div
              className={styles.empathyEmoji}
              style={{ background: getEmotionMeta(empathy.primary_emotion).color }}
            >
              {getEmotionMeta(empathy.primary_emotion).emoji}
            </div>
            <p className={styles.empathyMessage}>
              {stripRecommendationSentence(empathy.empathy_message)}
            </p>
          </div>
        ) : (
          <p className={styles.heroCardText}>
            {hasToday ? '오늘의 기록을 마치셨어요 ✨' : '오늘은 어떤 하루였나요?'}
          </p>
        )}

        {hasToday ? (
          <button className={styles.heroCta} onClick={onViewToday}>
            📖 오늘의 추천 다시 보기
          </button>
        ) : (
          <button className={styles.heroCta} onClick={onStartDiary}>
            ✍️ 기록 시작하기
          </button>
        )}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
//  컴포넌트: 이번 주 마음 흐름
// ═══════════════════════════════════════
function WeeklyMood({ weekDates, weeklyData, isLoading, user, onNavigate }) {
  const handleEmotionClick = (dateKey) => {
    if (user?.username) {
      onNavigate(`/diary/${user.username}/${dateKey}`);
    }
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
          const dateKey = formatDateForAPI(d.fullDate);
          const diary = weeklyData[dateKey];

          return (
            <div
              key={i}
              className={`${styles.moodItem} ${d.isToday ? styles.moodToday : ''}`}
            >
              <span className={styles.moodLabel}>{d.label}</span>

              <div className={styles.moodDotWrapper}>
                {diary ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.moodEmotion} ${styles.moodEmotionClickable} ${isLoading ? styles.moodLoading : ''}`}
                      style={{ backgroundColor: getEmotionMeta(diary.emotion?.primary_emotion).color }}
                      onClick={() => handleEmotionClick(dateKey)}
                      aria-label={`${dateKey} 일기 보기`}
                    >
                      <span className={styles.moodEmoji}>
                        {getEmotionMeta(diary.emotion?.primary_emotion).emoji}
                      </span>
                    </button>
                    <div className={styles.tooltip}>
                      <div className={styles.tooltipHeader}>
                        {getWeatherEmoji(diary.weather)} {diary.emotion?.primary_emotion || ''}
                      </div>
                      {diary.content && (
                        <div className={styles.tooltipPreview}>
                          {diary.content.slice(0, 60)}
                        </div>
                      )}
                    </div>
                  </>
                ) : d.isToday ? (
                  <span className={`${styles.moodDot} ${styles.moodEmpty}`} />
                ) : d.isPast ? (
                  <span className={`${styles.moodDot} ${styles.moodMissing}`} />
                ) : (
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
function RecommendedPreview({ todayDiary, onNavigate, onStartDiary }) {
  const rec = todayDiary?.recommendation?.[0];
  const music = rec?.musics?.[0];
  const movie = rec?.movies?.[0];
  const book = rec?.books?.[0];

  if (!rec || (!music && !movie && !book)) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionSubtitle}>🎁 오늘 추천받은 콘텐츠</h2>
        </div>
        <div className={styles.recommendedEmpty}>
          {todayDiary ? (
            <p>추천이 아직 준비되지 않았어요.</p>
          ) : (
            <>
              <p className={styles.recommendedEmptyText}>아직 오늘 일기를 작성하지 않으셨네요.</p>
              <button className={styles.linkBtn} onClick={onStartDiary}>
                ✍️ 일기 쓰러 가기 →
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  const cards = [];
  if (movie) {
    cards.push({
      key: `movie-${movie.movie_id}`,
      type: '🎬', typeLabel: '영화',
      title: movie.title,
      subtitle: movie.director || '',
      image: movie.image_url,
      link: movie.link_url,
    });
  }
  if (music) {
    cards.push({
      key: `music-${music.track_id}`,
      type: '🎵', typeLabel: '음악',
      title: music.title,
      subtitle: music.artist || '',
      image: music.image_url,
      link: music.link_url,
    });
  }
  if (book) {
    cards.push({
      key: `book-${book.isbn}`,
      type: '📖', typeLabel: '책',
      title: book.title,
      subtitle: book.author || '',
      image: book.cover_url,
      link: book.link?.replace(/&amp;/g, '&'),
    });
  }

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionSubtitle}>🎁 오늘 추천받은 콘텐츠</h2>
        <button className={styles.linkBtn} onClick={() => onNavigate('/recommended')}>
          모두 보기 →
        </button>
      </div>
      <div className={styles.recommendedScroll}>
        {cards.map((item) => (
          <a
            key={item.key}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.recommendedCard}
          >
            <div className={styles.recommendedThumbnail}>
              {item.image ? (
                <img src={item.image} alt={item.title} />
              ) : (
                <span className={styles.recommendedPlaceholder}>{item.type}</span>
              )}
            </div>
            <p className={styles.recommendedType}>{item.type} {item.typeLabel}</p>
            <p className={styles.recommendedTitle}>{item.title}</p>
            {item.subtitle && (
              <p className={styles.recommendedSubtitle}>{item.subtitle}</p>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════
//  컴포넌트: 최근 일기 목록
// ═══════════════════════════════════════
function RecentDiaries({ diaries, onNavigate, user }) {
  if (!diaries || diaries.length === 0) {
    return (
      <section className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionSubtitle}>최근 일기</h2>
        </div>
        <div className={styles.recommendedEmpty}>
          <p>아직 작성된 일기가 없어요. 오늘부터 시작해보세요!</p>
        </div>
      </section>
    );
  }

  const handleCardClick = (diary) => {
    if (!user?.username || !diary?.created_at) {
      // 사용자/날짜 정보가 없으면 안전하게 캘린더로
      onNavigate('/calendar');
      return;
    }
    const dateKey = formatDateForAPI(new Date(diary.created_at));
    onNavigate(`/diary/${user.username}/${dateKey}`);
  };

  return (
    <section className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionSubtitle}>최근 일기</h2>
        <button className={styles.linkBtn} onClick={() => onNavigate('/calendar')}>
          모두 보기 →
        </button>
      </div>
      <div className={styles.diaryList}>
        {diaries.map((diary) => (
          <div
            key={diary.id}
            className={styles.diaryCard}
            onClick={() => handleCardClick(diary)}
          >
            <div className={styles.diaryMeta}>
              <span className={styles.diaryDate}>{formatShortDate(diary.created_at)}</span>
              {diary.weather && (
                <span className={styles.diaryWeather}>{getWeatherEmoji(diary.weather)}</span>
              )}
              {diary.emotion?.primary_emotion && (
                <span className={styles.diaryMoodTag}>
                  {getEmotionMeta(diary.emotion.primary_emotion).emoji} {diary.emotion.primary_emotion}
                </span>
              )}
            </div>
            <p className={styles.diaryPreview}>
              "{(diary.content || '').slice(0, 80)}{diary.content?.length > 80 ? '...' : ''}"
            </p>
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

  const [weeklyData, setWeeklyData] = useState({});
  const [empathy, setEmpathy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const weekDates = getWeekDates();
  const todayKey = formatDateForAPI(new Date());
  const todayDiary = weeklyData[todayKey] || null;

  const recentDiaries = Object.entries(weeklyData)
    .filter(([key]) => key !== todayKey)
    .map(([, data]) => data)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);

  // ─── 이번 주 일기 병렬 조회 ───
  const fetchWeeklyData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);

    const requests = weekDates.map((d) => {
      const dateStr = formatDateForAPI(d.fullDate);
      return api
        .get(`/api/diary/${dateStr}/`)
        .then((res) => ({ date: dateStr, data: res.data }))
        .catch((err) => {
          if (err.response?.status !== 404) {
            console.warn(`[diary/${dateStr}] 조회 실패:`, err.message);
          }
          return null;
        });
    });

    try {
      const results = await Promise.all(requests);
      const data = {};
      results.forEach((r) => {
        if (r && r.data && r.data.id) data[r.date] = r.data;
      });
      setWeeklyData(data);
    } catch (err) {
      console.error('이번 주 일기 조회 중 오류:', err);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ─── 공감 멘트 조회 ───
  const fetchEmpathy = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/api/diary/empathy/');
      setEmpathy(res.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.warn('[diary/empathy] 조회 실패:', err.message);
      }
      setEmpathy(null);
    }
  }, [user]);

  useEffect(() => {
    fetchWeeklyData();
    fetchEmpathy();
  }, [fetchWeeklyData, fetchEmpathy]);

  // ─── 로그아웃 ───
  const handleLogout = async () => {
    try {
      await api.post('/api/logout/', {});
    } catch (error) {
      console.error('로그아웃 요청 실패', error);
    }
    localStorage.removeItem('token');
    logout();
    navigate('/login');
  };

  const handleStartDiary = () => {
    if (todayDiary) {
      alert('오늘은 이미 일기를 작성하셨어요. 내일 다시 만나요!');
      return;
    }
    navigate('/diary/write');
  };

  const handleViewToday = () => {
    navigate(`/calendar?date=${todayKey}`);
  };

  return (
    <div className={styles.mainpage}>
      <TopNav user={user} onLogout={handleLogout} onNavigate={navigate} />

      <main className={styles.mainContent}>
        <HeroSection
          user={user}
          todayDiary={todayDiary}
          empathy={empathy}
          onStartDiary={handleStartDiary}
          onViewToday={handleViewToday}
        />

        <WeeklyMood
          weekDates={weekDates}
          weeklyData={weeklyData}
          isLoading={isLoading}
          user={user}
          onNavigate={navigate}
        />

        <RecommendedPreview
          todayDiary={todayDiary}
          onNavigate={navigate}
          onStartDiary={handleStartDiary}
        />

        <RecentDiaries diaries={recentDiaries} onNavigate={navigate} user={user} />
      </main>

      <footer className={styles.mainFooter}>
        <p>© 2026 Day by Day</p>
      </footer>
    </div>
  );
}

export default Mainpage;