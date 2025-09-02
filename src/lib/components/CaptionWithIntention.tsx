import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { gsap } from 'gsap';

// Caption With Intention 타이밍 동기화 데이터 타입
interface TimingSyncData {
  version: string;
  created_at: string;
  total_duration: number;
  sync_precision_ms: number;
  layout_settings?: {
    work_area: {
      bottom_percent: number;
      caption_layout?: any;
      safety_margins: any;
    };
    caption_boxes: Array<{
      line_index: number;
      bottom_position: number;
      height: number;
      style: string;
    }>;
    box_spacing: number;
    rendering: string;
    individual_box: boolean;
  };
  sync_events: SyncEvent[];
  global_timing_adjustments: {
    pre_reading_lead_ms: number;
    color_transition_overlap_ms: number;
    animation_buffer_ms: number;
  };
}

interface SyncEvent {
  event_id: string;
  speaker_id: string;
  segment_id: string;
  sentence: string;
  pre_reading: {
    text: string;
    start: number;
    end: number;
    style: string;
    alpha: string;
  };
  active_speech_words: Word[];
}

export interface CharacterTiming {
  character: string;
  char_index: number;
  start_time: number;
  end_time: number;
  peak_time?: number;  // Time when the wave reaches its peak
  relative_delay: number;
}

interface Word {
  word: string;
  word_index: number;
  start: number;
  end: number;
  pronunciation_start: number;
  color_transition: {
    from_color: string;
    to_color: string;
    duration_ms: number;
  };
  // New unified animation system
  animation_type?: "bouncing" | "elevation" | "whisper" | "loud" | "normal";
  animation_config?: {
    scale_percent?: number;       // Overall scale (100 = normal)
    duration_ms?: number;         // Animation duration
    wave_enabled?: boolean;       // Enable wave effect
    wave_height_range?: {         // Wave amplitude
      min: number;
      max: number;
    };
    position_y?: number;          // Y-axis movement (pixels)
    opacity?: number;             // Opacity (0-1)
    blur?: number;                // Blur amount (pixels)
    font_scale?: number;          // Font size multiplier
    trembling?: boolean;          // Trembling effect for elevation
    character_delay_ms?: number;  // Delay between characters
    character_timings?: CharacterTiming[];  // Character-level timing for wave effect
  };
  font_adjustments: {
    size_percent: number;
    weight: number;
    width: number;
  };
  // Legacy fields - to be removed after full migration
  pop_animation?: {
    start: number;
    scale_up_duration_ms: number;
    scale_down_duration_ms: number;
    max_scale_percent: number;
  };
  bouncing_animation?: {
    enabled: boolean;
    scale_increase_percent?: number;
    min_height_percent: number;
    max_height_percent: number;
    character_delay_ms: number;
    wave_pattern: string;
    wave_cycles?: number;
    character_timings?: CharacterTiming[];
  };
  special_effects?: {
    loud_voice?: boolean;
    whisper_voice?: boolean;
    base_scale?: number;
  };
}


interface CaptionWithIntentionProps {
  videoSrc?: string;
  timingSyncSrc?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
  syncOffset?: number; // Sync offset in seconds (positive delays, negative advances)
}

// ASS 색상을 CSS 색상으로 변환
const assColorToCss = (assColor: string): string => {
  // ASS 색상 형태: &H00FFFF00 (BGR 형태)
  const hex = assColor.replace('&H', '').replace('&', '');
  if (hex === '00FFFFFF') return '#FFFFFF'; // 흰색
  
  // BGR을 RGB로 변환
  const bgr = hex.slice(-6); // 마지막 6자리
  const b = bgr.slice(0, 2);
  const g = bgr.slice(2, 4);
  const r = bgr.slice(4, 6);
  
  return `#${r}${g}${b}`;
};

// GSAP 기반 애니메이션 관리자 클래스
class GSAPAnimationManager {
  private activeAnimations = new Map<string, gsap.core.Timeline>();
  private waveAnimations = new Map<string, { element: HTMLElement, charPhase: number, bounceRange: number, startTime: number, duration: number, waveCycles: number, pronunciationStart: number, charTiming?: CharacterTiming }>();
  private videoRef: React.RefObject<HTMLVideoElement | null> | null = null;
  private isPaused = false;

  createBouncingAnimation(
    element: HTMLElement,
    charIndex: number,
    wordLength: number,
    popAnimationData: Word['pop_animation'] | undefined,
    bouncingAnimation: Word['bouncing_animation'],
    screenHeight: number,
    elevationHeight: number = 0,
    startTime: number = 0,
    wordDuration: number = 0.5,
    pronunciationStart: number = 0,
    charTiming?: CharacterTiming
  ): gsap.core.Timeline {
    const animationId = `${element.dataset.charIndex || charIndex}-bounce`;
    
    // 애니메이션 중복 방지만 (kill은 사용자 컴포너트에서 처리)
    if (this.activeAnimations.has(animationId)) {
      this.activeAnimations.get(animationId)?.kill();
    }

    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => {
        // 자연스러운 elastic.out 완료를 위해 강제 reset 제거
        this.activeAnimations.delete(animationId);
      }
    });

    if (!bouncingAnimation?.enabled) return timeline;

    const minBounce = screenHeight * (bouncingAnimation.min_height_percent / 100);
    const maxBounce = screenHeight * (bouncingAnimation.max_height_percent / 100);
    const bounceRange = maxBounce - minBounce;

    // 연속적인 파도 애니메이션을 위한 위상(phase) 계산
    const phaseOffset = (Math.PI * 2) / wordLength; // 각 글자 간 위상 차이
    const charPhase = charIndex * phaseOffset; // 이 글자의 초기 위상
    
    // Use word duration for animation duration (scaled appropriately)
    // The animation should span the entire word duration
    const animationDuration = wordDuration;
    
    // Get wave cycles from bouncing animation config or default
    const waveCycles = bouncingAnimation.wave_cycles || 1.5;
    
    // 웨이브 애니메이션 데이터 저장 (비디오 시간 기반 계산용)
    // Peak should occur at pronunciation start
    this.waveAnimations.set(animationId, {
      element,
      charPhase,
      bounceRange,
      startTime,
      duration: animationDuration,
      waveCycles,
      pronunciationStart,
      charTiming
    });
    
    // 초기 위치 설정만
    timeline
      .set(element, { 
        y: 0,  // 항상 베이스라인에서 시작
        transformOrigin: "bottom"
      })

    this.activeAnimations.set(animationId, timeline);
    return timeline;
  }

  createColorTransition(
    element: HTMLElement,
    fromColor: string,
    toColor: string,
    duration: number
  ): gsap.core.Timeline {
    const animationId = `${element.dataset.charIndex}-color`;
    
    // 기존 색상 애니메이션 정리
    if (this.activeAnimations.has(animationId)) {
      this.activeAnimations.get(animationId)?.kill();
    }

    const timeline = gsap.timeline({
      paused: true,
      onComplete: () => this.activeAnimations.delete(animationId)
    });

    // GSAP의 부드러운 색상 전환
    timeline.to(element, {
      color: toColor,
      duration: duration / 1000,
      ease: "power2.inOut"
    });

    this.activeAnimations.set(animationId, timeline);
    return timeline;
  }

  playAnimation(animationId: string) {
    this.activeAnimations.get(animationId)?.play();
  }

  setVideoRef(ref: React.RefObject<HTMLVideoElement | null>) {
    this.videoRef = ref;
  }

  // 비디오 시간 기반으로 웨이브 애니메이션 업데이트
  updateWaveAnimations(videoTime: number) {
    this.waveAnimations.forEach((data, id) => {
      const { element, charPhase, bounceRange, startTime, duration, waveCycles, pronunciationStart, charTiming } = data;
      
      // Use character-specific timing if available
      const animStartTime = charTiming?.start_time ?? startTime;
      const animDuration = charTiming ? (charTiming.end_time - charTiming.start_time) : duration;
      const elapsed = videoTime - animStartTime;
      
      if (elapsed >= 0 && elapsed <= animDuration) {
        const progress = elapsed / animDuration;
        
        // Use peak_time if available, otherwise fall back to pronunciation start
        const peakTime = charTiming?.peak_time ?? pronunciationStart;
        const peakOffset = (peakTime - animStartTime) / animDuration;
        
        // Adjust phase so peak occurs at peak_time (25% through animation by design)
        const peakPhaseShift = -peakOffset * waveCycles * Math.PI * 2 + Math.PI / 2; // PI/2 for peak
        
        const wavePosition = progress * waveCycles * Math.PI * 2;
        // Apply phase shift to align peak with peak_time
        const sineValue = Math.abs(Math.sin(wavePosition + charPhase + peakPhaseShift));
        
        // Smoother damping curve for more natural wave
        const damping = Math.pow(Math.cos(progress * Math.PI / 2), 1.5); // Cosine-based damping
        const currentY = -bounceRange * sineValue * damping;
        gsap.set(element, { y: currentY });
      } else if (elapsed > animDuration) {
        gsap.set(element, { y: 0 });
        this.waveAnimations.delete(id);
      }
    });
  }
  
  pauseAll() {
    this.isPaused = true;
    // 모든 active GSAP timelines 일시정지
    this.activeAnimations.forEach(timeline => timeline.pause());
  }

  resumeAll() {
    this.isPaused = false;
    // 모든 active GSAP timelines 재개
    this.activeAnimations.forEach(timeline => timeline.resume());
  }

  clearAll() {
    this.activeAnimations.forEach(timeline => timeline.kill());
    this.activeAnimations.clear();
  }
}

export const CaptionWithIntention: React.FC<CaptionWithIntentionProps> = ({
  videoSrc,
  timingSyncSrc,
  width = 800,
  height = 450,
  responsive = true,
  syncOffset = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const animationManagerRef = useRef<GSAPAnimationManager>(new GSAPAnimationManager());
  
  const [timingData, setTimingData] = useState<TimingSyncData | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [containerSize, setContainerSize] = useState({ width, height });
  const segmentCacheRef = useRef<Map<string, any[][]>>(new Map());
  const currentSegmentIndexRef = useRef<Map<string, number>>(new Map());

  // 현재 시간에 해당하는 이벤트들 찾기 (sync offset 적용)
  const getCurrentEvents = useCallback((time: number) => {
    if (!timingData) return { preReading: [], activeWords: [], elevations: [] };

    // Apply sync offset - subtract offset from time to adjust timing
    // If offset is positive (delay), we check earlier times
    // If offset is negative (advance), we check later times
    const adjustedTime = time - syncOffset;

    const preReading = timingData.sync_events.filter(event => 
      adjustedTime >= event.pre_reading.start && adjustedTime <= event.pre_reading.end
    );

    const activeWords: (Word & { event: SyncEvent })[] = [];
    timingData.sync_events.forEach(event => {
      event.active_speech_words.forEach(word => {
        if (adjustedTime >= word.start && adjustedTime <= word.end) {
          activeWords.push({ ...word, event });
        }
      });
    });

    return { preReading, activeWords };
  }, [timingData, syncOffset]);

  // requestVideoFrameCallback을 사용한 프레임 정밀 동기화
  const videoFrameCallbackRef = useRef<number>();
  
  const updateVideoFrame = useCallback((now: DOMHighResTimeStamp, metadata: any) => {
    const video = videoRef.current;
    if (!video) return;
    
    const currentTime = video.currentTime;
    setCurrentTime(currentTime);
    
    // 웨이브 애니메이션 업데이트
    animationManagerRef.current.updateWaveAnimations(currentTime);
    
    // 다음 프레임 요청
    if (isPlaying) {
      videoFrameCallbackRef.current = (video as any).requestVideoFrameCallback(updateVideoFrame);
    }
  }, [isPlaying]);
  
  // 컴포너트 언마운트시 GSAP 애니메이션 정리
  useEffect(() => {
    return () => {
      animationManagerRef.current.clearAll();
    };
  }, []);

  // 비디오 이벤트 리스너
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Animation Manager에 video ref 설정
    animationManagerRef.current.setVideoRef(videoRef);

    const handlePlay = () => {
      setIsPlaying(true);
      animationManagerRef.current.resumeAll();
    };
    const handlePause = () => {
      setIsPlaying(false);
      animationManagerRef.current.pauseAll();
    };
    const handleTimeUpdate = () => setCurrentTime(video.currentTime);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  // 비디오 프레임 콜백 관리
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying && 'requestVideoFrameCallback' in video) {
      videoFrameCallbackRef.current = (video as any).requestVideoFrameCallback(updateVideoFrame);
    } else if (isPlaying) {
      // Fallback to requestAnimationFrame if requestVideoFrameCallback not available
      const fallbackUpdate = () => {
        if (videoRef.current && isPlaying) {
          setCurrentTime(videoRef.current.currentTime);
          animationManagerRef.current.updateWaveAnimations(videoRef.current.currentTime);
        }
        animationFrameRef.current = requestAnimationFrame(fallbackUpdate);
      };
      animationFrameRef.current = requestAnimationFrame(fallbackUpdate);
    } else {
      // 일시정지 시 콜백 취소
      if (videoFrameCallbackRef.current && (video as any).cancelVideoFrameCallback) {
        (video as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      const video = videoRef.current;
      if (video && videoFrameCallbackRef.current && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
    };
  }, [isPlaying, updateVideoFrame]);

  // timing_sync.json 로드
  const loadTimingSync = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: TimingSyncData = await response.json();
      setTimingData(data);
      console.log('Caption With Intention timing data loaded:', data);
      
    } catch (error: any) {
      console.error('Failed to load timing sync data:', error);
      setError(`Failed to load timing sync data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 자동 로드
  useEffect(() => {
    if (timingSyncSrc) {
      loadTimingSync(timingSyncSrc);
    }
  }, [timingSyncSrc]);

  // 반응형 레이아웃 지원 (ResizeObserver) - 성능 최적화된 버전
  useEffect(() => {
    if (!responsive || !containerRef.current) return;

    let resizeTimeout: number;
    
    const resizeObserver = new ResizeObserver((entries) => {
      // 리사이즈 이벤트 쓰로틀링 (60fps 제한)
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        for (const entry of entries) {
          const { width: newWidth, height: newHeight } = entry.contentRect;
          if (Math.abs(newWidth - containerSize.width) > 1 || Math.abs(newHeight - containerSize.height) > 1) {
            setContainerSize({ width: newWidth, height: newHeight });
          }
        }
      }, 16); // ~60fps
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
    };
  }, [responsive, containerSize.width, containerSize.height]);

  // 파일 업로드 핸들러들
  const handleVideoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      videoRef.current.src = url;
      console.log('Video file loaded:', file.name);
    }
  };

  const handleTimingSyncFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: TimingSyncData = JSON.parse(text);
      setTimingData(data);
      console.log('Timing sync file loaded:', file.name);
      setError(null);
    } catch (error) {
      console.error('Failed to load timing sync file:', error);
      setError(`Failed to load timing sync file: ${error}`);
    }
  };

  const handleLoadTestTimingSync = async () => {
    await loadTimingSync('/test-output/generated_timing_sync.json');
  };

  const handleLoadEnhancedTimingSync = async () => {
    await loadTimingSync('/test-output/enhanced_timing_sync.json');
  };

  // 현재 표시할 이벤트들 (성능 최적화)
  const currentEvents = useMemo(() => getCurrentEvents(currentTime), [currentTime, getCurrentEvents]);

  // 실제 사용할 크기 (반응형 또는 고정)
  const actualSize = responsive ? containerSize : { width, height };

  return (
    <div className="caption-with-intention">
      <style>{`
        @keyframes trembling {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(2px, -1px); }
          50% { transform: translate(-1px, 1px); }
          75% { transform: translate(1px, -1px); }
        }
        @keyframes trembling-elevated {
          0%, 100% { transform: translateY(var(--elevation-y)) scale(var(--elevation-scale)) translate(0, 0); }
          25% { transform: translateY(var(--elevation-y)) scale(var(--elevation-scale)) translate(2px, -1px); }
          50% { transform: translateY(var(--elevation-y)) scale(var(--elevation-scale)) translate(-1px, 1px); }
          75% { transform: translateY(var(--elevation-y)) scale(var(--elevation-scale)) translate(1px, -1px); }
        }
        @keyframes trembling-loud {
          0%, 100% { transform: translate(0, 0) scale(var(--scale, 1)); }
          25% { transform: translate(var(--amp-x, 1px), 0) scale(var(--scale, 1)); }
          50% { transform: translate(0, var(--amp-y, 0.5px)) scale(var(--scale, 1)); }
          75% { transform: translate(calc(var(--amp-x, 1px) * -1), 0) scale(var(--scale, 1)); }
        }
      `}</style>
      <div 
        className="player-container" 
        ref={containerRef}
        style={{ 
          position: 'relative', 
          width: responsive ? '100%' : width, 
          height: responsive ? '100%' : height,
          maxWidth: responsive ? '100vw' : 'none',
          maxHeight: responsive ? '100vh' : 'none',
          aspectRatio: responsive ? '16/9' : 'auto'
        }}
      >
        {/* 비디오 */}
        <video
          ref={videoRef}
          width={actualSize.width}
          height={actualSize.height}
          controls
          src={videoSrc}
          style={{ 
            width: '100%',
            height: '100%',
            backgroundColor: '#000'
          }}
        />
        
        {/* Caption With Intention 오버레이 */}
        <div
          className="caption-overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none'
          }}
        >
          {/* 하단 작업 영역 - layout_settings 기반 */}
          <div
            className="work-area"
            style={{
              position: 'absolute',
              bottom: 0,
              left: timingData?.layout_settings?.work_area?.safety_margins?.left_percent 
                ? `${timingData.layout_settings.work_area.safety_margins.left_percent * 100}%` 
                : '5%',
              right: timingData?.layout_settings?.work_area?.safety_margins?.right_percent 
                ? `${timingData.layout_settings.work_area.safety_margins.right_percent * 100}%` 
                : '5%',
              height: timingData?.layout_settings?.work_area?.bottom_percent 
                ? `${timingData.layout_settings.work_area.bottom_percent}%` 
                : '20%',
              paddingBottom: timingData?.layout_settings?.work_area?.safety_margins?.bottom_percent 
                ? `${timingData.layout_settings.work_area.safety_margins.bottom_percent * 100}%` 
                : '2%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              overflow: 'visible' // Loud effect 등이 work_area를 넘어갈 수 있도록 허용
              // position: absolute로 인해 caption box들의 positioning context 역할
            }}
          >
            {/* 개별 Caption Box 렌더링 - layout_settings 기반 */}
            {(() => {
              // 현재 시간에 표시해야 할 이벤트 찾기 (sync offset 적용)
              // 우선순위: 1) 현재 발화 중인 단어가 있는 이벤트 (word_index가 낮은 것 우선) 2) pre-reading 시간 범위에 있는 이벤트
              let currentEvent = null;
              let lowestWordIndex = Infinity;
              
              // Apply sync offset to current time for event selection
              const adjustedTime = currentTime - syncOffset;
              
              // 먼저 현재 발화 중인 단어가 있는 이벤트를 찾음
              // 여러 이벤트에 같은 단어가 있을 경우, word_index가 낮은 (문장 앞쪽) 이벤트를 선택
              for (const event of currentEvents.preReading) {
                const activeWord = event.active_speech_words.find(word => 
                  adjustedTime >= word.start && adjustedTime <= word.end
                );
                
                if (activeWord) {
                  // word_index가 더 낮은 이벤트를 우선 선택 (새 문장의 시읉 우선)
                  if (activeWord.word_index < lowestWordIndex) {
                    currentEvent = event;
                    lowestWordIndex = activeWord.word_index;
                  }
                }
              }
              
              // 발화 중인 단어가 없으면 pre-reading 범위에 있는 이벤트 찾기
              if (!currentEvent) {
                currentEvent = currentEvents.preReading.find(event => {
                  const eventStart = event.pre_reading.start;
                  const eventEnd = event.pre_reading.end;
                  return adjustedTime >= eventStart && adjustedTime <= eventEnd;
                });
              }
              
              if (!currentEvent) return null;
              
              // 세그먼트 캐싱 키 생성
              const cacheKey = `${currentEvent.event_id}_${actualSize.width}_${actualSize.height}`;
              
              let segments = segmentCacheRef.current.get(cacheKey);
              if (!segments) {
                // Work area 기반 caption box 최대 너비 계산
                const safetyMargins = timingData?.layout_settings?.work_area?.safety_margins;
                // Work area의 실제 너비 계산 (left/right margin 고려)
                const workAreaWidthPercent = safetyMargins 
                  ? (100 - (safetyMargins.left_percent * 100) - (safetyMargins.right_percent * 100))
                  : 90;
                const workAreaWidth = actualSize.width * (workAreaWidthPercent / 100);

                // Caption box padding 계산
                const horizontalPadding = timingData?.layout_settings?.caption_box_style?.padding?.horizontal_percent ?? 3.5;
                const captionBoxPadding = workAreaWidth * (horizontalPadding / 100) * 2; // 양쪽 padding

                // Caption box의 최대 너비 (work area 내에서)
                const captionBoxMaxWidth = workAreaWidth - captionBoxPadding;
                
                // 세그먼트 분할
                segments = [];
                let currentSegment = [];
                let estimatedWidth = 0;
                const fontSize = 5 * (actualSize.height / 100);
                const charWidth = fontSize * 0.6; // 대략적인 문자 너비
                
                for (const word of currentEvent.active_speech_words) {
                  const wordWidth = (word.word.length + 1) * charWidth;
                  if (estimatedWidth + wordWidth <= captionBoxMaxWidth) {
                    currentSegment.push(word);
                    estimatedWidth += wordWidth;
                  } else {
                    // 현재 세그먼트 저장하고 새 세그먼트 시작
                    if (currentSegment.length > 0) {
                      segments.push([...currentSegment]);
                    }
                    currentSegment = [word];
                    estimatedWidth = wordWidth;
                  }
                }
                // 마지막 세그먼트 추가
                if (currentSegment.length > 0) {
                  segments.push(currentSegment);
                }
                
                // 캐시에 저장
                segmentCacheRef.current.set(cacheKey, segments);
              }
              
              // 현재 표시할 세그먼트 결정
              let wordsToDisplay = [];
              let currentSegmentIndex = 0;
              
              if (segments && segments.length > 0) {
                // 이전에 표시된 세그먼트 인덱스 가져오기
                const previousIndex = currentSegmentIndexRef.current.get(cacheKey) || 0;
                
                // 현재 발화 중인 단어가 있는지 확인 (sync offset 적용)
                const adjustedTimeForSegment = currentTime - syncOffset;
                const hasActiveWord = currentEvent.active_speech_words.some(word => 
                  adjustedTimeForSegment >= word.start && adjustedTimeForSegment <= word.end
                );
                
                if (!hasActiveWord) {
                  // Pre-reading이거나 단어 사이 공백
                  // 이전 인덱스가 있으면 유지
                  currentSegmentIndex = previousIndex;
                  
                  // 첫 번째 세그먼트의 첫 단어가 아직 시작 안 했으면 pre-reading (sync offset 적용)
                  const firstWordOfFirstSegment = segments[0]?.[0];
                  if (firstWordOfFirstSegment && adjustedTimeForSegment < firstWordOfFirstSegment.start) {
                    currentSegmentIndex = 0;
                  }
                  
                  wordsToDisplay = segments[currentSegmentIndex] || [];
                } else {
                  // 현재 발화 중인 단어가 포함된 세그먼트 찾기
                  let foundSegmentIndex = -1;
                  
                  for (let i = 0; i < segments.length; i++) {
                    const segment = segments[i];
                    const hasActiveWordInSegment = segment.some(segWord => 
                      adjustedTimeForSegment >= segWord.start && adjustedTimeForSegment <= segWord.end
                    );
                    if (hasActiveWordInSegment) {
                      foundSegmentIndex = i;
                      break;
                    }
                  }
                  
                  // 세그먼트를 찾았으면 사용, 못 찾았으면 이전 인덱스 유지
                  if (foundSegmentIndex !== -1) {
                    currentSegmentIndex = foundSegmentIndex;
                  } else {
                    // 현재 세그먼트의 마지막 단어가 끝났는지 확인
                    if (previousIndex < segments.length) {
                      const previousSegment = segments[previousIndex];
                      const lastWordInPrevSegment = previousSegment[previousSegment.length - 1];
                      if (lastWordInPrevSegment && adjustedTimeForSegment > lastWordInPrevSegment.end) {
                        // 다음 세그먼트로 이동
                        currentSegmentIndex = Math.min(previousIndex + 1, segments.length - 1);
                      } else {
                        // 이전 세그먼트 유지
                        currentSegmentIndex = previousIndex;
                      }
                    } else {
                      currentSegmentIndex = 0;
                    }
                  }
                  
                  wordsToDisplay = segments[currentSegmentIndex] || [];
                }
                
                // 현재 세그먼트 인덱스 저장
                currentSegmentIndexRef.current.set(cacheKey, currentSegmentIndex);
              }
              
              // wordsToDisplay를 가진 새로운 이벤트 객체 생성
              const displayEvent = {
                ...currentEvent,
                active_speech_words: wordsToDisplay
              };
              
              // 동시에 발화하는 다른 화자가 있는지 확인 (sync offset 적용)
              const overlappingEvents = currentEvents.preReading.filter(event => {
                // 같은 화자의 이벤트는 제외 (같은 이벤트이거나 같은 speaker_id)
                if (event === currentEvent || event.speaker_id === currentEvent.speaker_id) return false;
                const eventStart = event.pre_reading.start;
                const eventEnd = event.pre_reading.end;
                const adjustedTimeCheck = currentTime - syncOffset;
                return adjustedTimeCheck >= eventStart && adjustedTimeCheck <= eventEnd;
              });
              
              // Caption box 할당 로직
              const lineGroups: SyncEvent[][] = [];
              lineGroups[0] = []; // 상단 box 초기화
              lineGroups[1] = []; // 하단 box 초기화
              
              if (overlappingEvents.length > 0) {
                // 겹치는 화자가 있으면 상단과 하단 사용
                const overlappingEvent = overlappingEvents[0];
                
                // 상단 박스용 overlapping event도 세그먼트 처리
                const overlappingCacheKey = `${overlappingEvent.event_id}_${actualSize.width}_${actualSize.height}`;
                let overlappingSegments = segmentCacheRef.current.get(overlappingCacheKey);
                
                if (!overlappingSegments) {
                  // Work area 기반 caption box 최대 너비 계산 (현재 이벤트와 동일한 로직)
                  const safetyMargins = timingData?.layout_settings?.work_area?.safety_margins;
                  const workAreaWidthPercent = safetyMargins 
                    ? (100 - (safetyMargins.left_percent * 100) - (safetyMargins.right_percent * 100))
                    : 90;
                  const workAreaWidth = actualSize.width * (workAreaWidthPercent / 100);
                  const horizontalPadding = timingData?.layout_settings?.caption_box_style?.padding?.horizontal_percent ?? 3.5;
                  const captionBoxPadding = workAreaWidth * (horizontalPadding / 100) * 2;
                  const captionBoxMaxWidth = workAreaWidth - captionBoxPadding;
                  
                  // 세그먼트 분할
                  overlappingSegments = [];
                  let currentSegment = [];
                  let estimatedWidth = 0;
                  const fontSize = 5 * (actualSize.height / 100);
                  const charWidth = fontSize * 0.6;
                  
                  for (const word of overlappingEvent.active_speech_words) {
                    const wordWidth = (word.word.length + 1) * charWidth;
                    if (estimatedWidth + wordWidth <= captionBoxMaxWidth) {
                      currentSegment.push(word);
                      estimatedWidth += wordWidth;
                    } else {
                      if (currentSegment.length > 0) {
                        overlappingSegments.push([...currentSegment]);
                      }
                      currentSegment = [word];
                      estimatedWidth = wordWidth;
                    }
                  }
                  if (currentSegment.length > 0) {
                    overlappingSegments.push(currentSegment);
                  }
                  
                  segmentCacheRef.current.set(overlappingCacheKey, overlappingSegments);
                }
                
                // 상단 박스용 현재 세그먼트 결정
                let overlappingWordsToDisplay = [];
                let overlappingSegmentIndex = 0;
                
                if (overlappingSegments && overlappingSegments.length > 0) {
                  const previousIndex = currentSegmentIndexRef.current.get(overlappingCacheKey) || 0;
                  const adjustedTimeForOverlapping = currentTime - syncOffset;
                  
                  const hasActiveWordInOverlapping = overlappingEvent.active_speech_words.some(word => 
                    adjustedTimeForOverlapping >= word.start && adjustedTimeForOverlapping <= word.end
                  );
                  
                  if (!hasActiveWordInOverlapping) {
                    overlappingSegmentIndex = previousIndex;
                    const firstWordOfFirstSegment = overlappingSegments[0]?.[0];
                    if (firstWordOfFirstSegment && adjustedTimeForOverlapping < firstWordOfFirstSegment.start) {
                      overlappingSegmentIndex = 0;
                    }
                    overlappingWordsToDisplay = overlappingSegments[overlappingSegmentIndex] || [];
                  } else {
                    let foundSegmentIndex = -1;
                    for (let i = 0; i < overlappingSegments.length; i++) {
                      const segment = overlappingSegments[i];
                      const hasActiveWordInSegment = segment.some(segWord => 
                        adjustedTimeForOverlapping >= segWord.start && adjustedTimeForOverlapping <= segWord.end
                      );
                      if (hasActiveWordInSegment) {
                        foundSegmentIndex = i;
                        break;
                      }
                    }
                    
                    if (foundSegmentIndex !== -1) {
                      overlappingSegmentIndex = foundSegmentIndex;
                    } else {
                      if (previousIndex < overlappingSegments.length) {
                        const previousSegment = overlappingSegments[previousIndex];
                        const lastWordInPrevSegment = previousSegment[previousSegment.length - 1];
                        if (lastWordInPrevSegment && adjustedTimeForOverlapping > lastWordInPrevSegment.end) {
                          overlappingSegmentIndex = Math.min(previousIndex + 1, overlappingSegments.length - 1);
                        } else {
                          overlappingSegmentIndex = previousIndex;
                        }
                      } else {
                        overlappingSegmentIndex = 0;
                      }
                    }
                    overlappingWordsToDisplay = overlappingSegments[overlappingSegmentIndex] || [];
                  }
                  
                  currentSegmentIndexRef.current.set(overlappingCacheKey, overlappingSegmentIndex);
                }
                
                // 상단 박스용 displayEvent 생성
                const overlappingDisplayEvent = {
                  ...overlappingEvent,
                  active_speech_words: overlappingWordsToDisplay
                };
                
                lineGroups[0] = [overlappingDisplayEvent]; // 상단 박스 (세그먼트 적용)
                lineGroups[1] = [displayEvent]; // 하단 박스 (세그먼트 적용)
              } else {
                // 겹치는 화자가 없으면 하단만 사용
                lineGroups[1] = [displayEvent];
              }
              
              // 각 라인별로 개별 caption box 렌더링
              return lineGroups.map((lineEvents, lineIndex) => {
                if (!lineEvents || lineEvents.length === 0) return null;
                const captionBox = timingData?.layout_settings?.caption_boxes?.[lineIndex];
                if (!captionBox) return null;
                
                // Caption box maxWidth: work_area의 100% 사용
                // work_area가 이미 safety margin을 적용했으므로
                let maxWidth = '100%';
                
                return (
                  <div
                    key={`caption-box-${lineIndex}`}
                    className={`caption-box line-${lineIndex}`}
                    style={{
                      position: 'absolute',
                      bottom: `${captionBox.bottom_position * actualSize.height / 100}px`, // Convert to pixels based on screen height
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 'fit-content', // Width fits content
                      maxWidth: maxWidth,
                      height: `${captionBox.height * actualSize.height / 100}px`, // Convert to pixels based on screen height
                      display: 'inline-flex', // Changed to inline-flex to fit content width
                      alignItems: 'flex-end', // 하단 고정으로 baseline 유지
                      justifyContent: 'center', // Horizontal center
                      flexWrap: 'nowrap', // No wrapping
                      backgroundColor: `rgba(0, 0, 0, ${(timingData?.layout_settings?.caption_box_style?.background_opacity ?? 90) / 100})`,
                      borderRadius: `${timingData?.layout_settings?.caption_box_style?.border_radius ?? 0}px`,
                      padding: `${actualSize.height * (timingData?.layout_settings?.caption_box_style?.padding?.vertical_percent ?? 2.5) / 100}px ${actualSize.width * (timingData?.layout_settings?.caption_box_style?.padding?.horizontal_percent ?? 3.5) / 100}px`,
                      boxSizing: 'border-box',
                      overflow: 'visible', // 애니메이션이 box를 벗어나도록 허용
                      zIndex: lineIndex === 0 ? 1 : 2, // 하단 box가 상단보다 위에 오도록
                      fontFamily: '"Roboto Flex Variable", "Roboto Flex", sans-serif',
                      fontSize: `${(timingData?.layout_settings?.caption_box_style?.baseline_font_size_percent ?? 5) * (actualSize.height / 100)}px`,
                      color: 'white',
                      lineHeight: 1, // 글자 크기 증가가 위로만 확장되도록
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)'
                    }}
                  >
                    {/* Caption With Intention 렌더링 - 라인별 이벤트만 렌더링 */}
                    {lineEvents.map((event) => (
                <div
                  key={`sentence-${event.event_id}`}
                  className="caption-sentence"
                  style={{
                    display: 'flex',
                    flexWrap: 'nowrap', // 자동 줄바꿈 방지
                    justifyContent: 'center',
                    alignItems: 'baseline',
                    gap: '4px',
                    whiteSpace: 'nowrap', // 텍스트 줄바꿈 방지
                    position: 'relative' // Allow elevated words to move independently
                  }}
                >
                  {event.active_speech_words.map((wordData, wordIndex) => {
                    const isCurrentlyActive = currentEvents.activeWords.some(w => w.word === wordData.word && w.word_index === wordData.word_index);
                    // Apply sync offset for word timing checks
                    const adjustedTimeForWord = currentTime - syncOffset;
                    const hasBeenPronounced = adjustedTimeForWord >= wordData.start;
                    const isCurrentlyBeingPronounced = adjustedTimeForWord >= wordData.start && adjustedTimeForWord <= wordData.end;
                    
                    // Use new animation registry if available
                    if (wordData.animation_type && wordData.animation_config) {
                      const config = wordData.animation_config;
                      const wordColor = hasBeenPronounced 
                        ? assColorToCss(wordData.color_transition.to_color) 
                        : 'rgba(255, 255, 255, 0.9)';
                      
                      const baselineSize = (timingData?.layout_settings?.caption_box_style?.baseline_font_size_percent ?? 4.5) * (actualSize.height / 100);
                      // Apply font size scaling for whisper and loud animation types
                      let fontSize = baselineSize;
                      if (wordData.animation_type === 'whisper' && config.font_size_percent) {
                        // For whisper, use smaller size during pronunciation, return to baseline after
                        fontSize = (isCurrentlyBeingPronounced && !config.return_to_baseline) || 
                                   (isCurrentlyBeingPronounced && config.return_to_baseline)
                          ? config.font_size_percent * (actualSize.height / 100)
                          : baselineSize;
                      }
                      if (wordData.animation_type === 'loud' && config.font_size_percent) {
                        // For loud, use larger size during pronunciation, return to baseline after
                        fontSize = isCurrentlyBeingPronounced
                          ? config.font_size_percent * (actualSize.height / 100)
                          : baselineSize;
                      }
                      
                      // Handle bouncing animation with character-by-character rendering
                      if (wordData.animation_type === 'bouncing') {
                        // Use the legacy bouncing system for wave effect
                        return (
                          <span
                            key={`word-${wordIndex}`}
                            className="caption-word"
                            style={{
                              fontSize: `${fontSize}px`,
                              fontWeight: wordData.font_adjustments.weight,
                              fontFamily: '"Roboto Flex Variable", "Roboto Flex", sans-serif',
                              fontVariationSettings: `"wdth" ${wordData.font_adjustments.width}, "wght" ${wordData.font_adjustments.weight}`,
                              display: 'inline-block',
                              textAlign: 'center',
                              margin: '0 2px',
                              verticalAlign: 'baseline',
                              transformOrigin: 'bottom'
                            }}
                          >
                            {wordData.word.split('').map((char, charIndex) => {
                              const charElementId = `char-${wordIndex}-${charIndex}`;
                              
                              // Pre-reading state
                              if (!hasBeenPronounced) {
                                return (
                                  <span
                                    key={charElementId}
                                    style={{
                                      display: 'inline-block',
                                      color: 'rgba(255, 255, 255, 0.9)',
                                      verticalAlign: 'baseline'
                                    }}
                                  >
                                    {char}
                                  </span>
                                );
                              }
                              
                              // Create bouncing config from animation_config
                              const bouncingConfig = {
                                enabled: true,
                                scale_increase_percent: config.scale_percent ? config.scale_percent - 100 : 15,
                                min_height_percent: config.wave_height_range?.min || 0.5,
                                max_height_percent: config.wave_height_range?.max || 2.5,
                                character_delay_ms: 0, // Not used, we use character timings
                                wave_pattern: 'sine',
                                character_timings: config.character_timings || wordData.bouncing_animation?.character_timings
                              };
                              
                              return (
                                <CharacterWithBounce
                                  key={charElementId}
                                  id={charElementId}
                                  char={char}
                                  charIndex={charIndex}
                                  wordData={{...wordData, bouncing_animation: bouncingConfig}}
                                  currentTime={currentTime}
                                  screenHeight={actualSize.height}
                                  elevationHeight={0}
                                  animationManager={animationManagerRef.current}
                                  syncOffset={syncOffset}
                                />
                              );
                            })}
                          </span>
                        );
                      }
                      
                      // Handle other animation types (elevation, whisper, loud)
                      let transform = '';
                      const opacity = config.opacity || 1;
                      let filter = '';
                      let animation = '';
                      let fontWeight: string | number = wordData.font_adjustments.weight;
                      let textShadow = '';
                      const cssVariables: Record<string, string | number> = {};
                      
                      if (isCurrentlyBeingPronounced) {
                        switch (wordData.animation_type) {
                          case 'elevation': {
                            const elevationY = (config.position_y || 0) * (actualSize.height / 1080);
                            const scale = (config.scale_percent || 100) / 100;
                            
                            if (config.trembling) {
                              // Use CSS variables for trembling-elevated animation
                              animation = 'trembling-elevated 100ms infinite';
                              // We'll set CSS variables on the element
                            } else {
                              transform = `translateY(${elevationY}px) scale(${scale})`;
                            }
                            break;
                          }
                          case 'whisper':
                            // Font size is already handled above
                            // No additional visual effects for whisper
                            break;
                          case 'loud': {
                            // Font size is handled above, no transform scale needed
                            
                            // Trembling animation temporarily disabled to prioritize fontSize effect
                            // TODO: Reimplement trembling with proper fontSize support
                            /*
                            const hasTrembling = config.trembling && typeof config.trembling === 'object' && 'enabled' in config.trembling && config.trembling.enabled;
                            
                            if (hasTrembling && typeof config.trembling === 'object' && 'frequency_hz' in config.trembling) {
                              // Use CSS animation for trembling without scale
                              animation = `trembling ${1000 / config.trembling.frequency_hz}ms infinite`;
                              cssVariables['--amp-x'] = `${config.trembling.amplitude_x || 1}px`;
                              cssVariables['--amp-y'] = `${config.trembling.amplitude_y || 0.5}px`;
                            }
                            */
                            
                            // Apply additional loud effects
                            if (config.brightness) {
                              filter = `brightness(${config.brightness})`;
                            }
                            if (config.font_weight) {
                              fontWeight = config.font_weight;
                            }
                            if (config.text_shadow) {
                              textShadow = config.text_shadow;
                            }
                            break;
                          }
                        }
                      }
                      
                      // Prepare CSS variables for elevation trembling
                      if (wordData.animation_type === 'elevation' && config.trembling && isCurrentlyBeingPronounced) {
                        const elevationY = (config.position_y || 0) * (actualSize.height / 1080);
                        const scale = (config.scale_percent || 100) / 100;
                        cssVariables['--elevation-y'] = `${elevationY}px`;
                        cssVariables['--elevation-scale'] = scale;
                      }
                      
                      return (
                        <span
                          key={`word-${wordIndex}`}
                          className="caption-word"
                          style={{
                            color: wordColor,
                            fontSize: `${fontSize}px`,
                            fontWeight: fontWeight,
                            fontFamily: '"Roboto Flex Variable", "Roboto Flex", sans-serif',
                            fontVariationSettings: `"wdth" ${wordData.font_adjustments.width}, "wght" ${fontWeight}`,
                            display: 'inline-block',
                            margin: '0 2px',
                            transform,
                            opacity,
                            filter,
                            animation,
                            textShadow: textShadow || undefined,
                            transformOrigin: 'center bottom',
                            transition: isCurrentlyBeingPronounced ? 'font-size 0.3s cubic-bezier(0.4, 0.0, 0.2, 1), all 0.3s ease' : 'font-size 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)',
                            ...cssVariables
                          }}
                        >
                          {wordData.word}
                        </span>
                      );
                    }
                    
                    // Fallback to legacy animation system
                    const shouldAnimate = isCurrentlyActive && wordData.bouncing_animation &&
                      currentTime >= wordData.start && 
                      currentTime <= wordData.end;
                    

                    // 색상 결정: 발음된 단어는 캐릭터 색상, 아직 발음되지 않은 단어는 반투명 흰색
                    const wordColor = hasBeenPronounced 
                      ? assColorToCss(wordData.color_transition.to_color) 
                      : 'rgba(255, 255, 255, 0.9)'; // Pre-reading: 90% opacity white
                    
                    // 폰트 크기 결정
                    const baselineSize = 5 * (actualSize.height / 100);
                    let currentFontSize = baselineSize;
                    
                    if (isCurrentlyBeingPronounced && wordData.special_effects?.loud_voice) {
                      currentFontSize = wordData.font_adjustments.size_percent * (actualSize.height / 100);
                    } else if (isCurrentlyBeingPronounced && wordData.special_effects?.whisper_voice) {
                      currentFontSize = wordData.font_adjustments.size_percent * (actualSize.height / 100);
                    }

                    // Special effects가 있는 단어는 발음 중일 때만 효과 적용
                    if (isCurrentlyBeingPronounced && (wordData.special_effects?.loud_voice || wordData.special_effects?.whisper_voice)) {
                      return (
                        <span
                          key={`word-${wordIndex}`}
                          className="caption-word"
                          style={{
                            color: wordColor,
                            fontSize: `${currentFontSize}px`,
                            fontWeight: wordData.font_adjustments.weight,
                            fontFamily: '"Roboto Flex Variable", "Roboto Flex", sans-serif',
                            fontVariationSettings: `"wdth" ${wordData.font_adjustments.width}, "wght" ${wordData.font_adjustments.weight}`,
                            transform: `
                              scale(${shouldAnimate && wordData.bouncing_animation ? (100 + (wordData.bouncing_animation.scale_increase_percent || 0)) / 100 : 1})
                            `,
                            transition: `
                              color ${wordData.color_transition.duration_ms}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                              transform ${300}ms cubic-bezier(0.4, 0.0, 0.2, 1),
                              font-size 150ms cubic-bezier(0.4, 0.0, 0.2, 1),
                              font-variation-settings 200ms ease
                            `,
                            display: 'inline-block',
                            textAlign: 'center',
                            margin: '0 2px',
                            verticalAlign: 'baseline',
                            transformOrigin: 'bottom',
                            // Special Effects
                            ...(isCurrentlyBeingPronounced && wordData.special_effects?.loud_voice && {
                              fontWeight: 'bold',
                              textShadow: '0 0 4px rgba(255, 255, 255, 0.3)',
                              filter: 'brightness(1.1)'
                            }),
                            ...(isCurrentlyBeingPronounced && wordData.special_effects?.whisper_voice && {
                              opacity: 0.8,
                              filter: 'blur(0.5px)',
                              fontWeight: Math.max(300, wordData.font_adjustments.weight)
                            })
                          }}
                        >
                          {wordData.word}
                        </span>
                      );
                    }
                    
                    // 일반 단어는 글자별 bouncing 적용
                    return (
                      <span
                        key={`word-${wordIndex}`}
                        className="caption-word"
                        style={{
                          fontSize: `${currentFontSize}px`,
                          fontWeight: wordData.font_adjustments.weight,
                          fontFamily: '"Roboto Flex Variable", "Roboto Flex", sans-serif',
                          fontVariationSettings: `"wdth" ${wordData.font_adjustments.width}, "wght" ${wordData.font_adjustments.weight}`,
                          display: 'inline-block',
                          textAlign: 'center',
                          margin: '0 2px',
                          verticalAlign: 'baseline',
                          transformOrigin: 'bottom'
                        }}
                      >
                        {wordData.word.split('').map((char, charIndex) => {
                          const charElementId = `char-${wordIndex}-${charIndex}`;
                          
                          // Pre-reading 상태일 때는 애니메이션 없이 색상만 적용
                          if (!hasBeenPronounced) {
                            return (
                              <span
                                key={charElementId}
                                style={{
                                  display: 'inline-block',
                                  color: 'rgba(255, 255, 255, 0.9)',
                                  verticalAlign: 'baseline'
                                }}
                              >
                                {char}
                              </span>
                            );
                          }
                          
                          // 발화 중이거나 발화 완료된 글자는 애니메이션 적용
                          const elevationHeight = isElevating && elevationWord.move_animation 
                            ? elevationWord.move_animation.to_y * (actualSize.height / 1080) 
                            : 0;
                          
                          return (
                            <CharacterWithBounce
                              key={charElementId}
                              id={charElementId}
                              char={char}
                              charIndex={charIndex}
                              wordData={wordData}
                              currentTime={currentTime}
                              screenHeight={actualSize.height}
                              elevationHeight={elevationHeight}
                              animationManager={animationManagerRef.current}
                              syncOffset={syncOffset}
                            />
                          );
                        })}
                      </span>
                    );
                  })}
                </div>
              ))}
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>
      
      {/* 상태 및 에러 표시 */}
      {error && (
        <div style={{
          marginTop: '10px',
          padding: '10px',
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          border: '1px solid #dc3545',
          borderRadius: '5px',
          color: '#dc3545'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        border: '1px solid #28a745',
        borderRadius: '5px',
        color: '#28a745'
      }}>
        <strong>Status:</strong> {
          isLoading ? 'Loading timing data...' :
          timingData ? `Caption With Intention Ready (${timingData.sync_events.length} events)` :
          'No timing data loaded'
        }
      </div>

      {/* 디버그 정보 */}
      <div style={{
        marginTop: '10px',
        padding: '10px',
        backgroundColor: 'rgba(108, 117, 125, 0.1)',
        border: '1px solid #6c757d',
        borderRadius: '5px',
        color: '#6c757d',
        fontSize: '12px'
      }}>
        <strong>Debug:</strong> Time: {currentTime.toFixed(2)}s | 
        Pre-reading: {currentEvents.preReading.length} | 
        Active words: {currentEvents.activeWords.length}
      </div>
      
      {/* 컨트롤 */}
      <div className="controls" style={{ marginTop: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Video File: 
            <input 
              type="file" 
              accept="video/*" 
              onChange={handleVideoFile}
              style={{ marginLeft: '10px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Timing Sync JSON File: 
            <input 
              type="file" 
              accept=".json" 
              onChange={handleTimingSyncFile}
              style={{ marginLeft: '10px' }}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleLoadTestTimingSync}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Load Basic Test
          </button>
          <button
            onClick={handleLoadEnhancedTimingSync}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            🎯 Load Enhanced CwI
          </button>
        </div>
        
        <div style={{ marginTop: '15px', fontSize: '0.9rem', color: '#666' }}>
          <p><strong>Caption With Intention</strong> - 업계 표준 디자인 시스템</p>
          <p>🎯 <strong>Enhanced CwI</strong>: 실제 음성 분석 기반 정밀 타이포그래피</p>
          <ul style={{ fontSize: '0.8rem', marginTop: '5px', paddingLeft: '20px' }}>
            <li>Volume → Font Size (3-12% 범위)</li>
            <li>Pitch → Font Weight (160-710 범위)</li>
            <li>Harmonics → Font Width (75-150% 범위)</li>
            <li>3-화자 색상 시스템: 시안/빨강/초록</li>
            <li>Special Effects: Loud Voice (240% scale) / Whisper (60% scale)</li>
            <li>25% Elevation Effect for dramatic speech</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// GSAP 기반 글자 애니메이션 컴포너트
const CharacterWithBounce: React.FC<{
  id: string;
  char: string;
  charIndex: number;
  wordData: Word;
  currentTime: number;
  screenHeight: number;
  elevationHeight: number;
  animationManager: GSAPAnimationManager;
  syncOffset?: number;
}> = ({ id, char, charIndex, wordData, currentTime, screenHeight, elevationHeight, animationManager, syncOffset = 0 }) => {
  const charRef = useRef<HTMLSpanElement>(null);
  const lastAnimationTimeRef = useRef<number>(-1);
  const lastColorTransitionRef = useRef<number>(-1);
  
  // Bouncing 애니메이션 (강화된 상태 관리)
  useEffect(() => {
    const charElement = charRef.current;
    if (!charElement || !wordData.bouncing_animation?.enabled) return;
    
    // Character-level timing - each character has its own timing
    const charTiming = wordData.bouncing_animation?.character_timings?.[charIndex];
    const charStartTime = charTiming?.start_time ?? wordData.start;
    const charEndTime = charTiming?.end_time ?? wordData.end;
    
    // Apply sync offset to character animation timing
    const adjustedTime = currentTime - syncOffset;
    
    // Check if this specific character should be animating
    const shouldStartAnimation = adjustedTime >= charStartTime && adjustedTime <= charEndTime;
    
    
    // 조건부 애니메이션 정리 (베이스라인으로 복귀)
    if (!shouldStartAnimation) {
      // 비활성시 애니메이션 정리하되 베이스라인으로 복귀
      gsap.killTweensOf(charElement);
      
      // 안전한 초기화: transform 완전 제거 후 베이스라인 설정
      gsap.set(charElement, { 
        clearProps: "transform",  // 모든 transform 제거
        y: 0,  // 베이스라인 설정
        transformOrigin: "bottom"
      });
      
    }
    
    // 중복 애니메이션 방지 + 상태 추적
    if (shouldStartAnimation && lastAnimationTimeRef.current !== charStartTime) {
      lastAnimationTimeRef.current = charStartTime;
      
      // Use character-specific duration
      const charDuration = charEndTime - charStartTime;
      const animation = animationManager.createBouncingAnimation(
        charElement,
        charIndex,
        wordData.word.length,
        undefined, // pop_animation removed
        wordData.bouncing_animation,
        screenHeight,
        elevationHeight,
        charStartTime,  // Use character start time instead of word start
        charDuration,   // Use character duration
        wordData.pronunciation_start,
        charTiming      // Pass character timing data
      );
      animation.play();
    }
  }, [currentTime, wordData.start, wordData.end, wordData.pronunciation_start, wordData.bouncing_animation, wordData.word.length, charIndex, screenHeight, elevationHeight, animationManager, syncOffset]); // 강화된 의존성
  
  // 색상 전환 애니메이션 (글자 단위)
  useEffect(() => {
    const charElement = charRef.current;
    if (!charElement) return;
    
    // 각 글자의 개별 타이밍 사용 - bouncing이면 peak_time, 아니면 pronunciation_start
    const charTiming = wordData.bouncing_animation?.character_timings?.[charIndex];
    const colorTransitionTime = charTiming?.peak_time ?? 
      (wordData.pronunciation_start || wordData.start);
    
    // Apply sync offset to color transition timing
    const adjustedTime = currentTime - syncOffset;
    const shouldTransitionColor = adjustedTime >= colorTransitionTime;
    
    // 중복 색상 전환 방지
    if (shouldTransitionColor && lastColorTransitionRef.current !== colorTransitionTime) {
      lastColorTransitionRef.current = colorTransitionTime;
      
      const colorAnimation = animationManager.createColorTransition(
        charElement,
        wordData.color_transition.from_color,
        assColorToCss(wordData.color_transition.to_color),
        wordData.color_transition.duration_ms
      );
      colorAnimation.play();
    }
  }, [currentTime, wordData, charIndex, animationManager, syncOffset]);
  
  // 초기 색상 설정 (글자 단위)
  const currentColor = useMemo(() => {
    const charTiming = wordData.bouncing_animation?.character_timings?.[charIndex];
    const colorTransitionTime = charTiming?.peak_time ?? 
      (wordData.pronunciation_start || wordData.start);
    
    // Apply sync offset for color determination
    const adjustedTime = currentTime - syncOffset;
    
    if (adjustedTime >= colorTransitionTime) {
      return assColorToCss(wordData.color_transition.to_color);
    }
    return assColorToCss(wordData.color_transition.from_color);
  }, [currentTime, wordData, charIndex, syncOffset]);
  
  
  return (
    <span
      ref={charRef}
      id={id}
      data-char-index={charIndex}
      style={{
        display: 'inline-block',
        color: currentColor,
        verticalAlign: 'baseline', // 베이스라인 정렬로 일관성 유지
        // transformOrigin 완전 제거 - GSAP에서만 설정 (GSAP 커뮤니티 권장사항)
      }}
    >
      {char}
    </span>
  );
};

export default CaptionWithIntention;