import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './DiaryDetail.module.css';

/* ====================================================
 * API Base URL
 * ==================================================== */
const API_BASE = process.env.REACT_APP_API_URL || '';

/* ====================================================
 * 감정 / 날씨 / 모드 매핑 (다른 페이지와 통일)
 * ==================================================== */
const EMOTION_META = {
  joy:      { emoji: '😊', label: '기쁨',   color: '#FBBF77' },
  sadness:  { emoji: '😢', label: '슬픔',   color: '#6FA8DC' },
  anger:    { emoji: '😠', label: '분노',   color: '#E89090' },
  fear:     { emoji: '😨', label: '두려움', color: '#B5A8D9' },
  trust:    { emoji: '🙂', label: '신뢰',   color: '#9BC4A5' },
  surprise: { emoji: '😲', label: '놀람',   color: '#F5C7B8' },
};

const KOR_TO_KEY = {
  '기쁨': 'joy',
  '슬픔': 'sadness',
  '분노': 'anger',
  '두려움': 'fear',
  '신뢰': 'trust',
  '놀람': 'surprise',
};

const WEATHER_EMOJI = {
  SUNNY: '☀️',
  CLOUDY: '☁️',
  RAINY: '🌧️',
  SNOWY: '❄️',
  THUNDER: '⛈️',
};

const WEATHER_LABEL = {
  SUNNY: '맑음',
  CLOUDY: '흐림',
  RAINY: '비',
  SNOWY: '눈',
  THUNDER: '천둥',
};

const MODE_LABEL = {
  shift: '기분 전환',
  match: '공감',
  comfort: '위로',
  energize: '활력',
};

const DAY_KOR = ['일', '월', '화', '수', '목', '금', '토'];

/* ====================================================
 * 유틸
 * ==================================================== */
function toDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseMovieTags(tagsArr) {
  if (!Array.isArray(tagsArr) || tagsArr.length === 0) return [];
  const raw = tagsArr[0];
  if (typeof raw !== 'string') return [];
  try {
    return JSON.parse(raw.replace(/'/g, '"'));
  } catch {
    return [];
  }
}

function decodeAmp(url) {
  return typeof url === 'string' ? url.replace(/&amp;/g, '&') : url;
}

function formatCreatedTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

/* ====================================================
 * 아이콘
 * ==================================================== */
function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"></polyline>
    </svg>
  );
}

/* ====================================================
 * 아이템 카드: 책 / 음악 / 영화
 * ==================================================== */
function BookCard({ book }) {
  return (
    <a
      href={decodeAmp(book.link)}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.itemCard}
    >
      <div className={styles.itemThumb}>
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} loading="lazy" />
        ) : (
          <span className={styles.itemPlaceholder}>📖</span>
        )}
      </div>
      <div className={styles.itemBody}>
        <h4 className={styles.itemTitle}>{book.title}</h4>
        <p className={styles.itemMeta}>{book.author}</p>
        {book.description && (
          <p className={styles.itemDesc}>{book.description}</p>
        )}
        {book.category && (
          <div className={styles.tagRow}>
            <span className={styles.tag}>{book.category}</span>
          </div>
        )}
      </div>
    </a>
  );
}

function MusicCard({ music }) {
  const tags = Array.isArray(music.tags) ? music.tags.slice(0, 3) : [];
  return (
    <a
      href={music.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.itemCard}
    >
      <div className={`${styles.itemThumb} ${styles.itemThumbSquare}`}>
        {music.image_url ? (
          <img src={music.image_url} alt={music.title} loading="lazy" />
        ) : (
          <span className={styles.itemPlaceholder}>🎵</span>
        )}
      </div>
      <div className={styles.itemBody}>
        <h4 className={styles.itemTitle}>{music.title}</h4>
        <p className={styles.itemMeta}>{music.artist}</p>
        {tags.length > 0 && (
          <div className={styles.tagRow}>
            {tags.map((tag, i) => (
              <span key={i} className={styles.tag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

function MovieCard({ movie }) {
  const genres = parseMovieTags(movie.tags);
  return (
    <a
      href={movie.link_url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.itemCard}
    >
      <div className={styles.itemThumb}>
        {movie.image_url ? (
          <img src={movie.image_url} alt={movie.title} loading="lazy" />
        ) : (
          <span className={styles.itemPlaceholder}>🎬</span>
        )}
      </div>
      <div className={styles.itemBody}>
        <h4 className={styles.itemTitle}>{movie.title}</h4>
        {movie.director && (
          <p className={styles.itemMeta}>감독 · {movie.director}</p>
        )}
        {genres.length > 0 && (
          <div className={styles.tagRow}>
            {genres.map((g, i) => (
              <span key={i} className={styles.tag}>{g}</span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}

/* ====================================================
 * 일기 본문 카드
 * ==================================================== */
function DiarySection({ diary }) {
  const { content, created_at, weather, emotion, image } = diary;
  const emotionKey = KOR_TO_KEY[emotion?.primary_emotion];
  const emotionMeta = emotionKey ? EMOTION_META[emotionKey] : null;
  const weatherEmoji = weather ? WEATHER_EMOJI[weather] : null;
  const weatherLabel = weather ? WEATHER_LABEL[weather] : null;
  const createdTime = formatCreatedTime(created_at);

  // 본문을 문단별로 분리 (\r\n 또는 \n 기준)
  const paragraphs = (content || '')
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className={styles.diaryCard}>
      <header className={styles.diaryHeader}>
        {createdTime && (
          <span className={styles.diaryTime}>{createdTime}에 작성</span>
        )}
        <div className={styles.diaryBadges}>
          {weatherEmoji && (
            <span className={styles.weatherBadge} title={weatherLabel || weather}>
              <span>{weatherEmoji}</span>
              {weatherLabel && <span>{weatherLabel}</span>}
            </span>
          )}
          {emotionMeta && (
            <span
              className={styles.emotionBadge}
              style={{ background: emotionMeta.color }}
            >
              <span className={styles.emotionBadgeEmoji}>{emotionMeta.emoji}</span>
              <span>{emotionMeta.label}</span>
            </span>
          )}
        </div>
      </header>

      {image && (
        <div className={styles.diaryImage}>
          <img src={image} alt="일기 이미지" />
        </div>
      )}

      <div className={styles.diaryContent}>
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p className={styles.diaryEmpty}>본문이 비어 있어요.</p>
        )}
      </div>
    </section>
  );
}

/* ====================================================
 * 감정 분석 카드 (6가지 감정 막대 + valence/arousal)
 * ==================================================== */
function EmotionChart({ emotion }) {
  if (!emotion) return null;

  const emotions = [
    { key: 'joy',      value: emotion.joy || 0 },
    { key: 'trust',    value: emotion.trust || 0 },
    { key: 'sadness',  value: emotion.sadness || 0 },
    { key: 'anger',    value: emotion.anger || 0 },
    { key: 'fear',     value: emotion.fear || 0 },
    { key: 'surprise', value: emotion.surprise || 0 },
  ];

  // 막대 비율: 가장 큰 값을 100%로 정규화 (최소 0.1 보장)
  const maxValue = Math.max(...emotions.map((e) => e.value), 0.1);

  const formatSigned = (v) => {
    if (v == null) return '0.00';
    const sign = v > 0 ? '+' : '';
    return `${sign}${v.toFixed(2)}`;
  };

  return (
    <section className={styles.emotionCard}>
      <header className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>감정 분석</h2>
        <span className={styles.cardSub}>일기에서 추출한 감정의 분포예요</span>
      </header>

      <div className={styles.emotionBars}>
        {emotions.map(({ key, value }) => {
          const meta = EMOTION_META[key];
          const percent = (value / maxValue) * 100;
          const displayPercent = Math.round(value * 100);
          return (
            <div key={key} className={styles.emotionBar}>
              <div className={styles.emotionBarLabel}>
                <span className={styles.emotionBarEmoji}>{meta.emoji}</span>
                <span className={styles.emotionBarName}>{meta.label}</span>
                <span className={styles.emotionBarValue}>{displayPercent}%</span>
              </div>
              <div className={styles.emotionBarTrack}>
                <div
                  className={styles.emotionBarFill}
                  style={{
                    width: `${percent}%`,
                    background: meta.color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.dimensionGrid}>
        <div className={styles.dimension}>
          <span className={styles.dimensionLabel}>긍정도</span>
          <span className={styles.dimensionValue}>
            {formatSigned(emotion.valence)}
          </span>
          <span className={styles.dimensionHint}>Valence · -1 ~ +1</span>
        </div>
        <div className={styles.dimension}>
          <span className={styles.dimensionLabel}>활성도</span>
          <span className={styles.dimensionValue}>
            {formatSigned(emotion.arousal)}
          </span>
          <span className={styles.dimensionHint}>Arousal · -1 ~ +1</span>
        </div>
      </div>
    </section>
  );
}

/* ====================================================
 * 추천 콘텐츠 카드 (책 3 + 음악 3 + 영화 3, 모두 펼침)
 * ==================================================== */
function RecommendationsSection({ recommendations }) {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    return (
      <section className={styles.recCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>오늘의 추천</h2>
        </header>
        <p className={styles.noRec}>아직 추천이 준비되지 않았어요.</p>
      </section>
    );
  }

  const rec = recommendations[0];
  const modeLabel = rec?.mode ? (MODE_LABEL[rec.mode] || rec.mode) : null;

  const sections = [
    { icon: '📖', title: '책',   items: rec.books,  Card: BookCard,  idKey: 'isbn' },
    { icon: '🎵', title: '음악', items: rec.musics, Card: MusicCard, idKey: 'track_id' },
    { icon: '🎬', title: '영화', items: rec.movies, Card: MovieCard, idKey: 'movie_id' },
  ];

  const hasAny = sections.some((s) => s.items && s.items.length > 0);
  if (!hasAny) {
    return (
      <section className={styles.recCard}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>오늘의 추천</h2>
        </header>
        <p className={styles.noRec}>아직 추천이 준비되지 않았어요.</p>
      </section>
    );
  }

  return (
    <section className={styles.recCard}>
      <header className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>오늘의 추천</h2>
        {modeLabel && (
          <span className={styles.modeBadge}>
            <span className={styles.modeDot} />
            {modeLabel}
          </span>
        )}
      </header>

      {sections.map(({ icon, title, items, Card, idKey }) =>
        items && items.length > 0 ? (
          <div key={title} className={styles.recSection}>
            <h3 className={styles.recSectionTitle}>
              <span className={styles.recSectionIcon}>{icon}</span>
              {title}
              <span className={styles.recSectionCount}>{items.length}</span>
            </h3>
            <div className={styles.itemList}>
              {items.map((item, i) => (
                <Card key={item[idKey] || `${title}-${i}`} {...{ [title === '책' ? 'book' : title === '음악' ? 'music' : 'movie']: item }} />
              ))}
            </div>
          </div>
        ) : null
      )}
    </section>
  );
}

/* ====================================================
 * 메인 페이지
 * ==================================================== */
function DiaryDetail() {
  const { username, date } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [diary, setDiary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // URL의 date가 YYYY-MM-DD 형식인지 검증
  const isValidDate = useMemo(
    () => /^\d{4}-\d{2}-\d{2}$/.test(date || ''),
    [date]
  );

  // 미래 날짜 차단
  const isFuture = useMemo(() => {
    if (!isValidDate) return false;
    const [y, m, d] = date.split('-').map(Number);
    const target = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target > today;
  }, [date, isValidDate]);

  /* ─── 일기 fetch ─── */
  useEffect(() => {
    if (!isValidDate || isFuture) return;

    const controller = new AbortController();

    const fetchDiary = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        setIsLoading(false);
        return;
      }

      // 본인 일기만 조회 가능 (백엔드도 토큰으로 차단하지만 클라이언트에서 명시적으로)
      if (user && user.username !== username) {
        setError('본인의 일기만 조회할 수 있어요.');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await axios.get(`${API_BASE}/api/diary/${date}/`, {
          headers: { Authorization: `Token ${token}` },
          signal: controller.signal,
        });
        setDiary(response.data);
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') return;

        const status = err.response?.status;
        if (status === 404) {
          setError('이 날의 일기를 찾을 수 없어요.');
        } else if (status === 401) {
          setError('로그인이 만료되었어요. 다시 로그인해주세요.');
        } else if (status === 403) {
          setError('이 일기에 접근할 권한이 없어요.');
        } else {
          console.error('일기 조회 실패', err);
          setError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDiary();
    return () => controller.abort();
  }, [date, username, user, isValidDate, isFuture]);

  /* ─── 잘못된 URL은 캘린더로 리다이렉트 ─── */
  if (!isValidDate) {
    return <Navigate to="/calendar" replace />;
  }

  /* ─── 날짜 라벨 계산 ─── */
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const weekday = DAY_KOR[dateObj.getDay()];
  const todayKey = toDateKey(new Date());
  const isToday = date === todayKey;

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

  return (
    <div className={styles.page}>
      {/* ───── 상단 네비게이션 ───── */}
      <nav className={styles.topnav}>
        <div className={styles.topnavLeft}>
          <span className={styles.topnavLogo}>Day by Day</span>
        </div>
        <div className={styles.topnavRight}>
          <button className={styles.topnavLink} onClick={() => navigate('/')}>홈</button>
          <button className={styles.topnavLink} onClick={() => navigate('/calendar')}>캘린더</button>
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
        {/* 헤더: 뒤로가기 + 큰 날짜 */}
        <header className={styles.pageHeader}>
          <button
            className={styles.backBtn}
            onClick={() => navigate('/calendar')}
          >
            <BackIcon />
            <span>캘린더로</span>
          </button>

          <div className={styles.dateDisplay}>
            <h1 className={styles.dateTitle}>
              <span className={styles.dateYear}>{year}년</span>
              <span className={styles.dateMain}>{month}월 {day}일</span>
            </h1>
            <p className={styles.dateSub}>
              <span>{weekday}요일</span>
              {isToday && <span className={styles.todayBadge}>오늘</span>}
            </p>
          </div>
        </header>

        {/* 에러 */}
        {error && (
          <div className={styles.errorState} role="alert">
            <span className={styles.errorIcon}>🌫️</span>
            <p className={styles.errorText}>{error}</p>
            <div className={styles.errorActions}>
              <button
                className={styles.secondaryBtn}
                onClick={() => navigate('/calendar')}
              >
                캘린더로 돌아가기
              </button>
              {error.includes('일기를 찾을 수 없') && (
                <button
                  className={styles.primaryBtn}
                  onClick={() => navigate('/diary/write')}
                >
                  ✍️ 일기 쓰러 가기
                </button>
              )}
            </div>
          </div>
        )}

        {/* 미래 날짜 */}
        {isFuture && !error && (
          <div className={styles.errorState}>
            <span className={styles.errorIcon}>⏳</span>
            <p className={styles.errorText}>아직 오지 않은 날이에요.</p>
            <button
              className={styles.secondaryBtn}
              onClick={() => navigate('/calendar')}
            >
              캘린더로 돌아가기
            </button>
          </div>
        )}

        {/* 로딩 */}
        {isLoading && !error && !isFuture && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>그 날을 불러오고 있어요…</p>
          </div>
        )}

        {/* 데이터 */}
        {!isLoading && !error && !isFuture && diary && (
          <>
            <DiarySection diary={diary} />
            <EmotionChart emotion={diary.emotion} />
            <RecommendationsSection recommendations={diary.recommendation} />
          </>
        )}
      </main>
    </div>
  );
}

export default DiaryDetail;