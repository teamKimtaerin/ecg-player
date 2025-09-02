// Main library exports
export { CaptionWithIntention } from './components/CaptionWithIntention';
export { GSAPAnimationManager } from './managers/GSAPAnimationManager';
export { assColorToCss } from './utils';

// Type exports
export type {
  TimingSyncData,
  SyncEvent,
  CharacterTiming,
  Word,
  ElevationEffect,
  CaptionWithIntentionProps,
  WordWithEvent,
  CurrentEvents
} from './types';

// Version
export const VERSION = '1.0.0';