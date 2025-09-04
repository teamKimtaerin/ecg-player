// Caption With Intention 타이밍 동기화 데이터 타입
export interface TimingSyncData {
  version: string;
  created_at: string;
  total_duration: number;
  sync_precision_ms: number;
  layout_settings?: LayoutSettings;
  sync_events: SyncEvent[];
  elevation_effects?: ElevationEffect[];
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
  peak_time?: number;  // Time when the wave reaches its peak
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
    font_size_percent?: number;   // Font size percentage
    brightness?: number;          // Brightness multiplier
    font_weight?: number;         // Font weight override
    text_shadow?: string;         // Text shadow CSS
    return_to_baseline?: boolean; // Return to baseline after animation
  };
  pop_animation?: {
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
  syncOffset?: number; // Sync offset in seconds (positive delays, negative advances)
}

export interface WordWithEvent extends Word {
  event: SyncEvent;
}

export interface CurrentEvents {
  preReading: SyncEvent[];
  activeWords: WordWithEvent[];
  elevations?: ElevationEffect[];
}

// Layout settings interface
export interface LayoutSettings {
  work_area: {
    bottom_percent: number;
    caption_layout?: any;
    safety_margins: {
      left_percent?: number;
      right_percent?: number;
      bottom_percent?: number;
    };
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
  caption_box_style?: {
    background_opacity?: number;
    border_radius?: number;
    padding?: {
      vertical_percent?: number;
      horizontal_percent?: number;
    };
    baseline_font_size_percent?: number;
  };
}