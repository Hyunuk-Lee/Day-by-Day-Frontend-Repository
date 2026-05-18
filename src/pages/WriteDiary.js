import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './WriteDiary.module.css';

// ─── 날씨 옵션 ───
const WEATHER_OPTIONS = [
  { value: 'sunny', emoji: '☀️', label: '맑음' },
  { value: 'cloudy', emoji: '⛅', label: '흐림' },
  { value: 'rainy', emoji: '🌧', label: '비' },
  { value: 'snowy', emoji: '❄️', label: '눈' },
  { value: 'windy', emoji: '💨', label: '바람' },
  { value: 'stormy', emoji: '⛈', label: '천둥' },
];

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

// ─── 유틸: 격려 메시지 랜덤 ───
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
//  Step 1: 일기 작성 폼
// ═══════════════════════════════════════
function DiaryWriteStep({ diary, setDiary, onNext, onBack }) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  // 텍스트 영역 자동 높이 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  }, [diary.content]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('이미지 크기는 5MB 이하만 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setDiary((prev) => ({
        ...prev,
        image: file,
        imagePreview: event.target.result,
      }));
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
      {/* 상단 헤더 */}
      <div className={styles.writeHeader}>
        <button className={styles.backBtn} onClick={onBack} aria-label="뒤로가기">
          ← 돌아가기
        </button>
        <span className={styles.writeDate}>{getFormattedDate()}</span>
        <div className={styles.headerSpacer} />
      </div>

      {/* 날씨 선택 */}
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

      {/* 일기 본문 */}
      <div className={styles.contentSection}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="오늘 하루는 어땠나요? 자유롭게 적어보세요..."
          value={diary.content}
          onChange={(e) => setDiary((prev) => ({ ...prev, content: e.target.value }))}
          rows={6}
        />
        <div className={styles.charCount}>
          {diary.content.length}자
        </div>
      </div>

      {/* 이미지 첨부 */}
      <div className={styles.imageSection}>
        {diary.imagePreview ? (
          <div className={styles.imagePreviewWrapper}>
            <img src={diary.imagePreview} alt="첨부 이미지" className={styles.imagePreview} />
            <button className={styles.imageRemoveBtn} onClick={removeImage}>✕</button>
          </div>
        ) : (
          <button
            className={styles.imageUploadBtn}
            onClick={() => fileInputRef.current?.click()}
          >
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

      {/* 기록 마무리하기 CTA */}
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
//  Step 2: 마무리 트랜지션
// ═══════════════════════════════════════
function TransitionStep({ onNext }) {
  const [message] = useState(getRandomEncouragement());

  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 3000);
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
//  Step 3: AI 감정 분석 로딩
// ═══════════════════════════════════════
function AnalyzingStep({ onNext }) {
  const [dots, setDots] = useState('');

  // 점 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // 2~3초 후 자동 전환 (실제로는 백엔드 응답 대기)
  useEffect(() => {
    const timer = setTimeout(() => {
      onNext();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <div className={styles.analyzingStep}>
      <div className={styles.analyzingContent}>
        <div className={styles.analyzingSpinner} />
        <h2 className={styles.analyzingText}>
          AI가 오늘의 감정을 분석하고 있어요{dots}
        </h2>
        <p className={styles.analyzingSubtext}>
          당신에게 어울리는 콘텐츠를 찾고 있습니다
        </p>

        {/* 스켈레톤 카드 미리보기 */}
        <div className={styles.skeletonCards}>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonIcon} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonIcon} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
          <div className={styles.skeletonCard}>
            <div className={styles.skeletonIcon} />
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
//  Step 4: 추천 결과
// ═══════════════════════════════════════
function ResultStep({ diary, onGoHome, onGoRecommended }) {
  // 더미 추천 데이터 — 백엔드 연동 시 교체
  const dummyResults = [
    {
      type: '🎬',
      category: '영화',
      title: '감정 분석 후 추천될 영화',
      description: '백엔드 연동 후 AI가 추천하는 영화가 표시됩니다.',
    },
    {
      type: '🎵',
      category: '음악',
      title: '감정 분석 후 추천될 음악',
      description: '백엔드 연동 후 AI가 추천하는 음악이 표시됩니다.',
    },
    {
      type: '📖',
      category: '책',
      title: '감정 분석 후 추천될 책',
      description: '백엔드 연동 후 AI가 추천하는 책이 표시됩니다.',
    },
  ];

  return (
    <div className={styles.resultStep}>
      <div className={styles.resultHeader}>
        <h2 className={styles.resultTitle}>오늘의 당신에게 어울리는 문화 컨텐츠</h2>
        <p className={styles.resultSubtitle}>Day by Day 자체 AI가 일기 내용을 바탕으로 선별했어요</p>
      </div>

      <div className={styles.resultCards}>
        {dummyResults.map((item, i) => (
          <div key={i} className={styles.resultCard} style={{ animationDelay: `${i * 0.15}s` }}>
            <div className={styles.resultCardIcon}>{item.type}</div>
            <div className={styles.resultCardBody}>
              <span className={styles.resultCardCategory}>{item.category}</span>
              <h3 className={styles.resultCardTitle}>{item.title}</h3>
              <p className={styles.resultCardDesc}>{item.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.resultActions}>
        <button className={styles.resultPrimaryBtn} onClick={onGoRecommended}>
          🎁 추천 보관함에서 더 보기
        </button>
        <button className={styles.resultSecondaryBtn} onClick={onGoHome}>
          🏠 홈으로 돌아가기
        </button>
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

  // step: 'write' → 'transition' → 'analyzing' → 'result'
  const [step, setStep] = useState('write');

  const [diary, setDiary] = useState({
    content: '',
    weather: '',
    image: null,
    imagePreview: null,
  });

  // 비로그인 시 로그인 페이지로
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // ─── Step 전환 핸들러 ───
  const handleFinishWrite = () => {
    // TODO: 백엔드에 일기 저장 API 호출
    // const token = localStorage.getItem('token');
    // const formData = new FormData();
    // formData.append('content', diary.content);
    // formData.append('weather', diary.weather);
    // if (diary.image) formData.append('image', diary.image);
    // await axios.post('http://localhost:8000/api/diaries/', formData, {
    //   headers: { Authorization: `Token ${token}`, 'Content-Type': 'multipart/form-data' }
    // });

    setStep('transition');
  };

  const handleTransitionEnd = () => {
    // TODO: 백엔드에 AI 감정 분석 요청
    // const token = localStorage.getItem('token');
    // const res = await axios.post('http://localhost:8000/api/analyze/', { diary_id }, {
    //   headers: { Authorization: `Token ${token}` }
    // });
    // setAnalysisResult(res.data);

    setStep('analyzing');
  };

  const handleAnalysisEnd = () => {
    // TODO: 분석 완료 후 추천 결과 세팅
    setStep('result');
  };

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
          onNext={handleFinishWrite}
          onBack={handleGoBack}
        />
      )}
      {step === 'transition' && (
        <TransitionStep onNext={handleTransitionEnd} />
      )}
      {step === 'analyzing' && (
        <AnalyzingStep onNext={handleAnalysisEnd} />
      )}
      {step === 'result' && (
        <ResultStep
          diary={diary}
          onGoHome={handleGoHome}
          onGoRecommended={handleGoRecommended}
        />
      )}
    </div>
  );
}

export default WriteDiary;