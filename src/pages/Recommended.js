import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import styles from './Recommended.module.css';

/* ====================================================
 * API Base URL
 * ==================================================== */
const API_BASE = process.env.REACT_APP_API_URL || '';

/* ====================================================
 * 감정 / 날씨 / 추천 모드 매핑 (캘린더·메인과 동일 팔레트)
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

function formatDayLabel(dateKey, todayKey, yesterdayKey) {
  if (dateKey === todayKey) return '오늘';
  if (dateKey === yesterdayKey) return '어제';
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일`;
}

function formatSubDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_KOR[date.getDay()]}요일`;
}

// 영화 tags: ["['액션', '드라마']"] → ['액션', '드라마']
function parseMovieTags(tagsArr) {
  if (!Array.isArray(tagsArr) || tagsArr.length === 0) return [];
  const raw = tagsArr[0];
  if (typeof raw !== 'string') return [];
  try {
    const normalized = raw.replace(/'/g, '"');
    const parsed = JSON.parse(normalized);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// 알라딘 링크 등에 포함된 &amp; 디코딩
function decodeAmp(url) {
  return typeof url === 'string' ? url.replace(/&amp;/g, '&') : url;
}

// 일기 미리보기 (개행 정리 + 길이 제한)
function makePreview(content, maxLen = 120) {
  if (!content) return '';
  const cleaned = content.replace(/\r\n|\r|\n/g, ' ').trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + '…' : cleaned;
}

/* ====================================================
 * Chevron 아이콘 (토글용)
 * ==================================================== */
function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );
}

/* ====================================================
 * 카테고리 섹션 (책 / 음악 / 영화)
 * - 처음에는 1개만 보이고, 토글로 나머지 2개 펼침
 * ==================================================== */
function CategorySection({ icon, title, items, renderItem }) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  const visibleItems = expanded ? items : items.slice(0, 1);
  const hasMore = items.length > 1;

  return (
    <div className={styles.category}>
      <div className={styles.categoryHeader}>
        <h3 className={styles.categoryTitle}>
          <span className={styles.categoryIcon}>{icon}</span>
          {title}
          <span className={styles.categoryCount}>{items.length}</span>
        </h3>
        {hasMore && (
          <button
            className={`${styles.toggleBtn} ${expanded ? styles.toggleExpanded : ''}`}
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            {expanded ? '접기' : `+${items.length - 1}개 더 보기`}
            <ChevronIcon />
          </button>
        )}
      </div>
      <div className={styles.itemList}>
        {visibleItems.map((item, i) => renderItem(item, i))}
      </div>
    </div>
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
 * 날짜 카드 (한 날짜의 일기 + 추천 콘텐츠)
 * ==================================================== */
function DayCard({ dateKey, diary, isToday, todayKey, yesterdayKey }) {
  const dayLabel = formatDayLabel(dateKey, todayKey, yesterdayKey);
  const subDate = formatSubDate(dateKey);

  // 일기가 없는 날 (404 또는 미작성)
  if (!diary) {
    return (
      <article className={`${styles.dayCard} ${styles.dayCardEmpty} ${isToday ? styles.dayCardToday : ''}`}>
        <header className={styles.dayHeader}>
          <div className={styles.dayHeaderLeft}>
            <h2 className={styles.dayLabel}>{dayLabel}</h2>
            <span className={styles.dayDate}>{dateKey} · {subDate}</span>
          </div>
        </header>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🌱</span>
          <p>이날은 기록이 없어요.</p>
        </div>
      </article>
    );
  }

  const { emotion, weather, content, recommendation } = diary;
  const emotionKey = KOR_TO_KEY[emotion?.primary_emotion];
  const emotionMeta = emotionKey ? EMOTION_META[emotionKey] : null;
  const weatherEmoji = weather ? WEATHER_EMOJI[weather] : null;
  const weatherLabel = weather ? WEATHER_LABEL[weather] : null;
  const preview = makePreview(content);

  // recommendation은 배열 — 첫 번째 추천 묶음 사용
  const rec = Array.isArray(recommendation) && recommendation.length > 0
    ? recommendation[0]
    : null;
  const modeLabel = rec?.mode ? (MODE_LABEL[rec.mode] || rec.mode) : null;

  const hasAnyRec = rec && (
    (rec.books && rec.books.length > 0) ||
    (rec.musics && rec.musics.length > 0) ||
    (rec.movies && rec.movies.length > 0)
  );

  return (
    <article className={`${styles.dayCard} ${isToday ? styles.dayCardToday : ''}`}>
      <header className={styles.dayHeader}>
        <div className={styles.dayHeaderLeft}>
          <h2 className={styles.dayLabel}>{dayLabel}</h2>
          <span className={styles.dayDate}>{dateKey} · {subDate}</span>
        </div>
        <div className={styles.dayMeta}>
          {weatherEmoji && (
            <span
              className={styles.weatherBadge}
              title={weatherLabel ? `날씨: ${weatherLabel}` : weather}
            >
              {weatherEmoji}
            </span>
          )}
          {emotionMeta && (
            <span
              className={styles.emotionBadge}
              style={{ background: emotionMeta.color }}
            >
              <span className={styles.emotionBadgeEmoji}>{emotionMeta.emoji}</span>
              <span className={styles.emotionBadgeLabel}>{emotionMeta.label}</span>
            </span>
          )}
        </div>
      </header>

      {preview && (
        <blockquote className={styles.diaryPreview}>
          {preview}
        </blockquote>
      )}

      {hasAnyRec ? (
        <div className={styles.recommendations}>
          {modeLabel && (
            <div className={styles.modeBadge}>
              <span className={styles.modeDot} />
              {modeLabel} 추천
            </div>
          )}

          <CategorySection
            icon="📖"
            title="책"
            items={rec.books}
            renderItem={(book, i) => (
              <BookCard key={book.isbn || `book-${i}`} book={book} />
            )}
          />
          <CategorySection
            icon="🎵"
            title="음악"
            items={rec.musics}
            renderItem={(music, i) => (
              <MusicCard key={music.track_id || `music-${i}`} music={music} />
            )}
          />
          <CategorySection
            icon="🎬"
            title="영화"
            items={rec.movies}
            renderItem={(movie, i) => (
              <MovieCard key={movie.movie_id || `movie-${i}`} movie={movie} />
            )}
          />
        </div>
      ) : (
        <p className={styles.noRec}>아직 추천이 준비되지 않았어요.</p>
      )}
    </article>
  );
}

/* ====================================================
 * 메인 페이지
 * ==================================================== */
function Recommended() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [diaryEntries, setDiaryEntries] = useState([]); // [{ dateKey, diary | null }]
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 최근 7일 (오늘 → 6일 전, 최신순)
  const past7Days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return toDateKey(d);
    });
  }, []);

  const todayKey = past7Days[0];
  const yesterdayKey = past7Days[1];

  /* ─── 최근 7일 일기/추천 데이터 fetch ─── */
  useEffect(() => {
    const controller = new AbortController();

    const fetchAll = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('로그인이 필요합니다.');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled(
          past7Days.map((date) =>
            axios.get(`${API_BASE}/api/diary/${date}/`, {
              headers: { Authorization: `Token ${token}` },
              signal: controller.signal,
            })
          )
        );

        // 401(인증 만료) 검출
        const authFailed = results.some(
          (r) => r.status === 'rejected' && r.reason?.response?.status === 401
        );
        if (authFailed) {
          setError('로그인이 만료되었어요. 다시 로그인해주세요.');
          setDiaryEntries(past7Days.map((dateKey) => ({ dateKey, diary: null })));
          return;
        }

        // 결과 정규화: fulfilled → 데이터, 404 → null(일기 없음), 그 외 → null + 콘솔
        const entries = past7Days.map((dateKey, i) => {
          const result = results[i];
          if (result.status === 'fulfilled') {
            return { dateKey, diary: result.value.data };
          }
          const status = result.reason?.response?.status;
          if (status !== 404 && !axios.isCancel(result.reason)) {
            console.warn(`[${dateKey}] 일기 조회 실패`, result.reason);
          }
          return { dateKey, diary: null };
        });

        setDiaryEntries(entries);
      } catch (err) {
        if (axios.isCancel(err) || err.name === 'CanceledError') return;
        console.error('추천 데이터 로딩 실패', err);
        setError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAll();

    return () => controller.abort();
  }, [past7Days]);

  /* ─── 핸들러 ─── */
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

  const hasAnyDiary = diaryEntries.some((e) => e.diary);
  const writtenCount = diaryEntries.filter((e) => e.diary).length;

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
        <header className={styles.pageHeader}>
          <p className={styles.pageSub}>마음에 닿는 컨텐츠</p>
          <h1 className={styles.pageTitle}>이번 주의 추천</h1>
          <p className={styles.pageDesc}>
            최근 7일간의 일기를 바탕으로 골라드린 책, 음악, 영화예요.
            {hasAnyDiary && (
              <span className={styles.pageDescCount}>
                · {writtenCount}일의 기록
              </span>
            )}
          </p>
        </header>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <span className={styles.errorIcon}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {isLoading && diaryEntries.length === 0 && (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p>추천을 불러오고 있어요…</p>
          </div>
        )}

        {!isLoading && diaryEntries.length > 0 && !hasAnyDiary && !error && (
          <div className={styles.globalEmpty}>
            <span className={styles.globalEmptyIcon}>📭</span>
            <h2 className={styles.globalEmptyTitle}>아직 기록이 없어요</h2>
            <p className={styles.globalEmptyText}>
              최근 7일간 작성한 일기가 없어서 추천해드릴 콘텐츠가 없어요.<br />
              첫 일기를 남기면 마음에 맞는 책·음악·영화를 추천해드릴게요.
            </p>
            <button className={styles.writeCta} onClick={() => navigate('/')}>
              ✍️ 일기 쓰러 가기
            </button>
          </div>
        )}

        {diaryEntries.length > 0 && hasAnyDiary && (
          <div className={styles.dayList}>
            {diaryEntries.map(({ dateKey, diary }) => (
              <DayCard
                key={dateKey}
                dateKey={dateKey}
                diary={diary}
                isToday={dateKey === todayKey}
                todayKey={todayKey}
                yesterdayKey={yesterdayKey}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default Recommended;