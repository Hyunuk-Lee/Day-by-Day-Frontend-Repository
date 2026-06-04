import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';                  // ← 공유 axios 인스턴스
import styles from './WriteDiary.module.css';

const WEATHER_OPTIONS = [
  { value: 'sunny', emoji: '☀️', label: '맑음' },
  { value: 'cloudy', emoji: '⛅', label: '흐림' },
  { value: 'rainy', emoji: '🌧', label: '비' },
  { value: 'snowy', emoji: '❄️', label: '눈' },
  { value: 'windy', emoji: '💨', label: '바람' },
  { value: 'stormy', emoji: '⛈', label: '천둥' },
];

const WEATHER_MAP = {
  sunny: 'SUNNY', cloudy: 'CLOUDY', rainy: 'RAINY',
  snowy: 'SNOWY', windy: 'WINDY', stormy: 'THUNDER',
};

const MODE_OPTIONS = [
  {
    value: 'maintain', label: '유지', emoji: '🌿',
    title: '지금의 감정 유지하기',
    description: '현재 감정 상태를 차분하게 유지할 수 있는 콘텐츠를 추천해요.',
  },
  {
    value: 'shift', label: '전환', emoji: '🌈',
    title: '다른 감정으로 전환하기',
    description: '우울하거나 화날 때, 긍정적이고 편안한 감정으로 바꿔줄 콘텐츠를 추천해요.',
  },
  {
    value: 'amplification', label: '극대화', emoji: '🔥',
    title: '지금 감정을 극대화하기',
    description: '행복하고 즐거운 감정을 더 끌어올려줄 흥미진진한 콘텐츠를 추천해요.',
  },
];

function getFormattedDate() {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${now.getFullYear()}. ${now.getMonth() + 1}. ${now.getDate()}. ${days[now.getDay()]}요일`;
}

const ENCOURAGEMENTS = [
  '오늘도 수고했어요 ✨',
  '기록하는 당신, 멋져요 🌟',
  '오늘 하루도 잘 보냈어요 💫',
  '당신의 하루가 소중해요 🌙',
];

function getRandomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

// ═══════════════════════════════════════
//  ModeSelector
// ═══════════════════════════════════════
function ModeSelector({ mode, setMode }) {
  const current = MODE_OPTIONS.find((m) => m.value === mode);
  return (
    <div className={styles.modeSection}>
      <p className={styles.modeSectionLabel}>오늘의 추천 방향</p>
      <div className={styles.modeToggle}>
        {MODE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`${styles.modeToggleBtn} ${mode === opt.value ? styles.modeToggleActive : ''}`}
            onClick={() => setMode(opt.value)}
            aria-label={opt.title}
          >
            <span className={styles.modeToggleEmoji}>{opt.emoji}</span>
            <span className={styles.modeToggleText}>{opt.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.modeDescription}>
        <strong className={styles.modeDescTitle}>{current.title}</strong>
        <span className={styles.modeDescText}>{current.description}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  Step 1: 일기 작성
// ═══════════════════════════════════════
function DiaryWriteStep({ diary, setDiary, mode, setMode, onNext, onBack }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    }
  }, [diary.content]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하만 가능합니다.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      setDiary((prev) => ({ ...prev, image: file, imagePreview: event.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setDiary((prev) => ({ ...prev, image: null, imagePreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const canSubmit = diary.content.trim().length > 0;

  return (
    <div className={styles.writeStep}>
      <div className={styles.writeHeader}>
        <button className={styles.backBtn} onClick={onBack}>← 돌아가기</button>
        <span className={styles.writeDate}>{getFormattedDate()}</span>
        <div className={styles.headerSpacer} />
      </div>

      <div className={styles.weatherSection}>
        <p className={styles.weatherLabel}>오늘의 날씨</p>
        <div className={styles.weatherOptions}>
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w.value}
              className={`${styles.weatherBtn} ${diary.weather === w.value ? styles.weatherActive : ''}`}
              onClick={() => setDiary((prev) => ({ ...prev, weather: w.value }))}
              aria-label={w.label}
            >
              <span className={styles.weatherEmoji}>{w.emoji}</span>
              <span className={styles.weatherText}>{w.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.contentSection}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="오늘 하루는 어땠나요? 자유롭게 적어보세요..."
          value={diary.content}
          onChange={(e) => setDiary((prev) => ({ ...prev, content: e.target.value }))}
          rows={6}
        />
        <div className={styles.charCount}>{diary.content.length}자</div>
      </div>

      <div className={styles.imageSection}>
        {diary.imagePreview ? (
          <div className={styles.imagePreviewWrapper}>
            <img src={diary.imagePreview} alt="첨부 이미지" className={styles.imagePreview} />
            <button className={styles.imageRemoveBtn} onClick={removeImage}>✕</button>
          </div>
        ) : (
          <button className={styles.imageUploadBtn} onClick={() => fileInputRef.current?.click()}>
            📷 사진 추가하기
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      <ModeSelector mode={mode} setMode={setMode} />

      <button
        className={`${styles.submitBtn} ${canSubmit ? '' : styles.submitDisabled}`}
        onClick={canSubmit ? onNext : undefined}
        disabled={!canSubmit}
      >
        ✍️ 기록 마무리하기
      </button>
    </div>
  );
}

// ═══════════════════════════════════════
//  Step 2: 트랜지션
// ═══════════════════════════════════════
function TransitionStep({ onNext }) {
  const [message] = useState(getRandomEncouragement());
  useEffect(() => {
    const timer = setTimeout(onNext, 3000);
    return () => clearTimeout(timer);
  }, [onNext]);
  return (
    <div className={styles.transitionStep} onClick={onNext}>
      <div className={styles.transitionContent}>
        <div className={styles.transitionIcon}>📖</div>
        <h2 className={styles.transitionText}>{message}</h2>
        <p className={styles.transitionHint}>화면을 탭하면 넘어갑니다</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  Step 3: 분석 로딩
// ═══════════════════════════════════════
function AnalyzingStep({ isReady, onNext }) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(onNext, 1000);
    return () => clearTimeout(timer);
  }, [isReady, onNext]);
  return (
    <div className={styles.analyzingStep}>
      <div className={styles.analyzingContent}>
        <div className={styles.analyzingSpinner} />
        <h2 className={styles.analyzingText}>AI가 오늘의 감정을 분석하고 있어요{dots}</h2>
        <p className={styles.analyzingSubtext}>당신에게 어울리는 콘텐츠를 찾고 있습니다</p>
        <div className={styles.skeletonCards}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonIcon} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  Step 4: 카드 컴포넌트들
// ═══════════════════════════════════════
function MovieCard({ data }) {
  if (!data) return null;
  return (
    <div className={styles.resultCard}>
      <div className={styles.resultCardThumb}>
        {data.image_url ? <img src={data.image_url} alt={data.title} /> : <span className={styles.resultCardThumbEmoji}>🎬</span>}
      </div>
      <div className={styles.resultCardBody}>
        <span className={styles.resultCardCategory}>🎬 영화</span>
        <h3 className={styles.resultCardTitle}>{data.title}</h3>
        {data.director && <p className={styles.resultCardMeta}>감독 · {data.director}</p>}
        {data.tags && data.tags.length > 0 && (
          <div className={styles.resultCardTags}>
            {data.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className={styles.resultTag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MusicCard({ data }) {
  if (!data) return null;
  return (
    <div className={styles.resultCard}>
      <div className={styles.resultCardThumb}>
        {data.image_url ? <img src={data.image_url} alt={data.title} /> : <span className={styles.resultCardThumbEmoji}>🎵</span>}
      </div>
      <div className={styles.resultCardBody}>
        <span className={styles.resultCardCategory}>🎵 음악</span>
        <h3 className={styles.resultCardTitle}>{data.title}</h3>
        {data.artist && <p className={styles.resultCardMeta}>{data.artist}</p>}
        {data.tags && data.tags.length > 0 && (
          <div className={styles.resultCardTags}>
            {data.tags.slice(0, 4).map((tag, i) => (
              <span key={i} className={styles.resultTag}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookCard({ data }) {
  if (!data) return null;
  const decodedLink = data.link?.replace(/&amp;/g, '&');
  return (
    <a
      href={decodedLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`${styles.resultCard} ${styles.resultCardBook}`}
    >
      <div className={styles.resultCardThumb}>
        <span className={styles.resultCardThumbEmoji}>📖</span>
      </div>
      <div className={styles.resultCardBody}>
        <span className={styles.resultCardCategory}>📖 책 · {data.category}</span>
        <h3 className={styles.resultCardTitle}>{data.title}</h3>
        {data.author && <p className={styles.resultCardMeta}>{data.author}</p>}
        {data.description && (
          <p className={styles.resultCardDesc}>
            {data.description.length > 100 ? data.description.slice(0, 100) + '...' : data.description}
          </p>
        )}
      </div>
    </a>
  );
}

function ResultStep({ recommendations, error, onGoHome, onGoRecommended, onRetry }) {
  const movie = recommendations?.movie;
  const music = recommendations?.music;
  const book = recommendations?.book;

  if (error) {
    return (
      <div className={styles.resultStep}>
        <div className={styles.resultHeader}>
          <h2 className={styles.resultTitle}>😢 추천을 불러오지 못했어요</h2>
          <p className={styles.resultSubtitle}>{error}</p>
        </div>
        <div className={styles.resultActions}>
          <button className={styles.resultPrimaryBtn} onClick={onRetry}>🔄 다시 시도하기</button>
          <button className={styles.resultSecondaryBtn} onClick={onGoHome}>🏠 홈으로 돌아가기</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.resultStep}>
      <div className={styles.resultHeader}>
        <h2 className={styles.resultTitle}>오늘의 당신에게 어울리는 문화 콘텐츠</h2>
        <p className={styles.resultSubtitle}>Day by Day 자체 AI가 일기 내용을 바탕으로 선별했어요</p>
      </div>
      <div className={styles.resultCards}>
        <MovieCard data={movie} />
        <MusicCard data={music} />
        <BookCard data={book} />
      </div>
      <div className={styles.resultActions}>
        <button className={styles.resultPrimaryBtn} onClick={onGoRecommended}>🎁 추천 보관함에서 더 보기</button>
        <button className={styles.resultSecondaryBtn} onClick={onGoHome}>🏠 홈으로 돌아가기</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  메인: WriteDiary 페이지
// ═══════════════════════════════════════
function WriteDiary() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [step, setStep] = useState('write');
  const [diary, setDiary] = useState({
    content: '', weather: '', image: null, imagePreview: null,
  });
  const [mode, setMode] = useState('maintain');

  const [diaryId, setDiaryId] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [isResultReady, setIsResultReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  // ─── Step 1 → Step 2: 일기 저장 ───
  const handleFinishWrite = async () => {
    try {
      const formData = new FormData();
      formData.append('content', diary.content);
      if (diary.weather) formData.append('weather', WEATHER_MAP[diary.weather]);
      if (diary.image) formData.append('image', diary.image);

      const res = await api.post('/api/diary/create/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDiaryId(res.data.id);
      console.log('[diary/create] 응답:', res.data);
      setStep('transition');
    } catch (err) {
      console.error('일기 저장 실패:', err);
      alert('일기 저장에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // ─── Step 2 → Step 3 → Step 4: 감정 분석 + 추천 ───
  const handleTransitionEnd = async () => {
    setStep('analyzing');
    setIsResultReady(false);
    setError(null);

    try {
      const analyzeRes = await api.post('/api/diary/send/', { diary_id: diaryId });
      console.log('[diary/send] 응답:', analyzeRes.data);

      const payload = { mode, count: 3 };

      const [movieRes, musicRes, bookRes] = await Promise.all([
        api.post(`/api/recommend/movie/${diaryId}/`, payload),
        api.post(`/api/recommend/music/${diaryId}/`, payload),
        api.post(`/api/recommend/books/${diaryId}/`, payload),
      ]);

      console.log('[movie]', movieRes.data);
      console.log('[music]', musicRes.data);
      console.log('[books]', bookRes.data);

      setRecommendations({
        movie: movieRes.data.recommendations?.[0] || null,
        music: musicRes.data.recommendations?.[0] || null,
        book: bookRes.data.recommendations?.[0] || null,
      });
      setIsResultReady(true);
    } catch (err) {
      console.error('감정 분석/추천 실패:', err);
      console.error('실패한 요청 URL:', err.config?.url);
      console.error('응답 상태:', err.response?.status, err.response?.data);
      setError(err.response?.data?.detail || `서버 응답을 받지 못했습니다. (${err.response?.status || 'NETWORK'})`);
      setIsResultReady(true);
    }
  };

  const handleAnalysisEnd = () => setStep('result');
  const handleRetry = () => { setError(null); handleTransitionEnd(); };
  const handleGoHome = () => navigate('/');
  const handleGoRecommended = () => navigate('/recommended');
  const handleGoBack = () => navigate('/');

  if (!user) return null;

  return (
    <div className={styles.page}>
      {step === 'write' && (
        <DiaryWriteStep
          diary={diary}
          setDiary={setDiary}
          mode={mode}
          setMode={setMode}
          onNext={handleFinishWrite}
          onBack={handleGoBack}
        />
      )}
      {step === 'transition' && <TransitionStep onNext={handleTransitionEnd} />}
      {step === 'analyzing' && <AnalyzingStep isReady={isResultReady} onNext={handleAnalysisEnd} />}
      {step === 'result' && (
        <ResultStep
          recommendations={recommendations}
          error={error}
          onGoHome={handleGoHome}
          onGoRecommended={handleGoRecommended}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

export default WriteDiary;