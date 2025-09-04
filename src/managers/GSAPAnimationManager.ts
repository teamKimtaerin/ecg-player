import { gsap } from 'gsap';
import type { Word } from '../types';

// GSAP 기반 애니메이션 관리자 클래스
export class GSAPAnimationManager {
  private activeAnimations = new Map<string, gsap.core.Timeline>();
  private waveAnimations = new Map<string, { 
    element: HTMLElement, 
    charPhase: number, 
    bounceRange: number, 
    startTime: number, 
    duration: number,
    preRoll?: number,
    peakPosition?: number 
  }>();

  createBouncingAnimation(
    element: HTMLElement,
    charIndex: number,
    wordLength: number,
    _popAnimationData: Word['pop_animation'] | undefined,
    bouncingAnimation: Word['bouncing_animation'],
    screenHeight: number,
    char: string = '',
    wordText: string = '',
    startTime: number = 0
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
    
    const animationDuration = _popAnimationData 
      ? (_popAnimationData.scale_up_duration_ms + _popAnimationData.scale_down_duration_ms) / 1000
      : 0.5;
    
    // Get pre-roll and peak position from bouncing animation config
    const preRoll = (bouncingAnimation as any).pre_roll_ms ? (bouncingAnimation as any).pre_roll_ms / 1000 : 0;
    const peakPosition = (bouncingAnimation as any).peak_position || 0.25;
    
    // Adjust start time with animation offset if provided
    const animationStartOffset = (bouncingAnimation as any).animation_start_offset || 0;
    const adjustedStartTime = startTime + animationStartOffset;
    
    // DEBUG: bouncing 범위 확인
    if (wordText === "Hello") {
      console.log(`[WAVE_CALC] ${char}(${charIndex}): bounceRange=${bounceRange.toFixed(1)}px, phase=${(charPhase * 180/Math.PI).toFixed(0)}°, duration=${animationDuration.toFixed(2)}s, preRoll=${preRoll.toFixed(2)}s`);
    }
    
    // 웨이브 애니메이션 데이터 저장 (비디오 시간 기반 계산용)
    this.waveAnimations.set(animationId, {
      element,
      charPhase,
      bounceRange,
      startTime: adjustedStartTime,
      duration: animationDuration,
      preRoll,
      peakPosition
    });
    
    // 초기 위치 설정만
    timeline
      .set(element, { 
        y: 0,  // 항상 베이스라인에서 시작
        transformOrigin: "center bottom"
      })

    this.activeAnimations.set(animationId, timeline);
    return timeline;
  }

  createColorTransition(
    element: HTMLElement,
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
      onComplete: () => {
        this.activeAnimations.delete(animationId);
      }
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

  // 비디오 시간 기반으로 웨이브 애니메이션 업데이트
  updateWaveAnimations(videoTime: number) {
    this.waveAnimations.forEach((data, id) => {
      const { element, charPhase, bounceRange, startTime, duration, preRoll = 0, peakPosition = 0.25 } = data;
      const elapsed = videoTime - startTime;
      
      // Include pre-roll in the animation timeline
      // const totalDuration = duration + preRoll;
      const adjustedElapsed = elapsed + preRoll;
      
      if (elapsed >= -preRoll && elapsed <= duration) {
        // Calculate progress considering pre-roll
        const progress = Math.max(0, Math.min(1, adjustedElapsed / duration));
        
        // Adjust wave position to ensure peak occurs at peakPosition
        const waveCycles = 0.5;
        // Shift the wave so that the peak occurs at peakPosition
        const phaseShift = -peakPosition * Math.PI * 2 * waveCycles;
        const wavePosition = (progress * waveCycles * Math.PI * 2) + phaseShift;
        
        // baseline 위로만 움직이도록 Math.abs 사용, 제곱 감쇄로 빠른 소멸
        const sineValue = Math.abs(Math.sin(wavePosition + charPhase));
        const damping = Math.pow(1 - progress, 2); // 제곱 감쇄
        const currentY = -bounceRange * sineValue * damping;
        gsap.set(element, { y: currentY });
      } else if (elapsed > duration) {
        gsap.set(element, { y: 0 });
        this.waveAnimations.delete(id);
      }
    });
  }
  
  pauseAll() {
    // 더 이상 필요 없음 - 비디오 시간 기반 업데이트로 대체
  }

  resumeAll() {
    // 더 이상 필요 없음 - 비디오 시간 기반 업데이트로 대체
  }

  clearAll() {
    this.activeAnimations.forEach(timeline => timeline.kill());
    this.activeAnimations.clear();
  }
}