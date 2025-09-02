// Caption With Intention 타이밍 동기화 데이터 타입
export interface TimingSyncData {
  version: string;
  created_at: string;
  total_duration: number;
  sync_precision_ms: number;
  sync_events: SyncEvent[];
  elevation_effects: ElevationEffect[];
  global_timing_adjustments: {
    pre_reading_lead_ms: number;
    color_transition_overlap_ms: number;
    animation_buffer_ms: number;
  };
}

export interface SyncEvent {
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
  relative_delay: number;
}

export interface Word {
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
  pop_animation: {
    start: number;
    scale_up_duration_ms: number;
    scale_down_duration_ms: number;
    max_scale_percent: number;
  };
  font_adjustments: {
    size_percent: number;
    weight: number;
    width: number;
  };
  bouncing_animation?: {
    enabled: boolean;
    min_height_percent: number;
    max_height_percent: number;
    character_delay_ms: number;
    wave_pattern: string;
    character_timings?: CharacterTiming[];
  };
  special_effects?: {
    loud_voice?: boolean;
    whisper_voice?: boolean;
    base_scale?: number;
  };
}

export interface ElevationEffect {
  effect_id: string;
  sentence: string;
  start: number;
  end: number;
  speaker_id: string;
  elevation_percent: number;
  words: {
    word: string;
    move_animation: {
      from_y: number;
      to_y: number;
      duration_ms: number;
    };
  }[];
}

export interface CaptionWithIntentionProps {
  videoSrc?: string;
  timingSyncSrc?: string;
  width?: number;
  height?: number;
  responsive?: boolean;
}

export interface WordWithEvent extends Word {
  event: SyncEvent;
}

export interface CurrentEvents {
  preReading: SyncEvent[];
  activeWords: WordWithEvent[];
  elevations: ElevationEffect[];
}