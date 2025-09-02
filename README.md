# ECG Player - Caption With Intention System

ECG Player is a React-based implementation of the **Caption With Intention** design system - a revolutionary captioning system that provides rich visual information about speaker identity, vocal characteristics, and speech dynamics for deaf and hard-of-hearing viewers.

## Features

### 🎭 Caption With Intention Renderer
- **JSON-based Timing Sync**: Precise word-by-word synchronization from timing_sync.json files
- **GSAP Animations**: High-performance animations including bouncing, wave, and elevation effects
- **Speaker Identity**: Dynamic color system with smooth transitions
- **Voice Characteristics**: Typography mapping based on audio analysis
  - Volume → Font Size (3%-12% screen height)
  - Pitch → Font Weight (160-710)
  - Harmonics → Font Width (75%-150%)
- **Pre-reading Support**: 90% opacity white text before speech
- **Special Effects**: Loud voice (240% scale) and whisper (60% scale) visual representations
- **Frame-Perfect Sync**: Uses requestVideoFrameCallback for precise video synchronization
- **Responsive Design**: Adapts to different screen sizes and aspect ratios


## Installation

```bash
# Clone the repository
git clone <repository-url>
cd ass-generator/ecg-player

# Install dependencies
npm install

# Start development server
npm run dev
```

## Usage

1. Upload a video file using the "Video File" input
2. Upload a timing sync JSON file using the "Timing Sync JSON File" input
   - Or click "Load Enhanced CwI" to load the test file
3. The player will automatically render Caption With Intention effects with:
   - Word-by-word color synchronization
   - Character-based bouncing animations
   - Dynamic typography based on audio features
   - Pre-reading text display
   - Special effects for loud and whisper speech
4. Use the video controls to play/pause and navigate

## Caption With Intention Specifications

### JSON Timing Sync Format
The system uses a JSON-based timing synchronization format that includes:
- **sync_events**: Array of speech events with pre-reading and active words
- **font_adjustments**: Dynamic typography parameters per word
- **color_transition**: Smooth color changes from white to character color
- **bouncing_animation**: Character-level wave animations
- **special_effects**: Loud voice and whisper visual indicators

### Animation System (GSAP-powered)
- **Bouncing Effect**: Character-by-character wave animation with configurable delay
- **Pop Animation**: 15% scale increase when words are pronounced
- **Elevation Effect**: 25% vertical lift for dramatic emphasis
- **Color Transitions**: 200ms smooth fade from white to character color
- **Wave Pattern**: Sine wave motion with damping for natural movement

### Typography Mapping
- **Volume → Font Size**: 
  - Whisper (-25dB): 3% screen height
  - Normal (-17dB): 5% screen height
  - Loud (-10dB): 8% screen height
- **Pitch → Font Weight**:
  - Low (80-120Hz): 600-710 weight
  - Normal (120-180Hz): 400 weight
  - High (180-250Hz): 160-300 weight
- **Harmonics → Font Width**:
  - Low harmonics: 150% width (expanded)
  - Normal: 100% width
  - High harmonics: 75% width (condensed)

## Technical Requirements

### Dependencies
- React 18+ with TypeScript
- GSAP 3.13+ for high-performance animations
- Roboto Flex Variable font
- Vite for development and building

## Development

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Type Checking
```bash
npm run tsc
```

## Example Usage

The Caption With Intention renderer displays synchronized captions with:

- **Character-by-character bouncing animations** with wave patterns
- **15% pop animations** when words are pronounced
- **25% elevation effects** for dramatic emphasis
- **Dynamic typography** based on audio analysis (volume, pitch, harmonics)
- **Smooth color transitions** from pre-reading white to character colors
- **Special effects** for loud (240% scale) and whisper (60% scale) speech

Test files are available in `public/test-output/`:
- `generated_timing_sync.json` - Basic timing sync with all effects
- `enhanced_timing_sync.json` - Enhanced version with audio analysis mapping

## License

This project implements the Caption With Intention design system for accessibility enhancement in video content.
