# ECG Player Library

A React component library (ECG Player) for implementing the Caption With Intention design system - an advanced captioning system that provides visual information about speaker identity, vocal characteristics, and speech dynamics for deaf and hard-of-hearing viewers.

## Features

- 🎨 **Speaker Identity through Color Coding** - 6-color system with character hierarchy
- 🎵 **Voice Characteristics via Typography** - Dynamic font adjustments based on audio analysis
- 🎬 **Audio-Visual Synchronization** - Word-by-word color synchronization with speech timing
- 📱 **Responsive Design** - Adapts to different screen sizes and aspect ratios
- ⚡ **High Performance** - GSAP-powered animations with frame-perfect synchronization

## Installation

### NPM
```bash
npm install ecg-player
```

### Yarn
```bash
yarn add ecg-player
```

### Local Development
```bash
# Clone the repository
git clone https://github.com/yourusername/ecg-player.git
cd ecg-player

# Install dependencies
npm install

# Build the library
npm run build:lib

# Link for local development
npm link

# In your project
npm link ecg-player
```

## Usage

### Basic Usage

```tsx
import React from 'react';
import { CaptionWithIntention } from 'ecg-player';
import 'ecg-player/styles'; // Import styles

function App() {
  return (
    <CaptionWithIntention
      videoSrc="/path/to/video.mp4"
      timingSyncSrc="/path/to/timing_sync.json"
      responsive={true}
    />
  );
}
```

### Advanced Usage with Custom Configuration

```tsx
import React, { useState } from 'react';
import { CaptionWithIntention } from 'ecg-player';
import type { TimingSyncData } from 'ecg-player';

function VideoPlayer() {
  const [timingData, setTimingData] = useState<TimingSyncData | null>(null);

  // Load timing data programmatically
  const loadTimingData = async () => {
    const response = await fetch('/api/caption-data');
    const data = await response.json();
    setTimingData(data);
  };

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CaptionWithIntention
        videoSrc="/video.mp4"
        width={1920}
        height={1080}
        responsive={true}
      />
    </div>
  );
}
```

### Using with External Video Players

```tsx
import React, { useRef, useEffect } from 'react';
import { CaptionWithIntention } from 'ecg-player';

function CustomVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <div className="video-container">
      <video ref={videoRef} src="/video.mp4" />
      <CaptionWithIntention
        // Pass the video element reference
        videoRef={videoRef}
        timingSyncSrc="/timing_sync.json"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoSrc` | `string` | - | URL or path to the video file |
| `timingSyncSrc` | `string` | - | URL or path to the timing synchronization JSON file |
| `width` | `number` | 800 | Fixed width of the player (when responsive is false) |
| `height` | `number` | 450 | Fixed height of the player (when responsive is false) |
| `responsive` | `boolean` | true | Enable responsive sizing |

## Timing Sync Data Format

The Caption With Intention system requires a specific JSON format for timing synchronization:

```typescript
interface TimingSyncData {
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
  };
  special_effects?: {
    loud_voice?: boolean;
    whisper_voice?: boolean;
  };
}
```

### Example Timing Sync Data

```json
{
  "version": "1.0.0",
  "created_at": "2024-01-01T00:00:00Z",
  "total_duration": 10.5,
  "sync_precision_ms": 10,
  "sync_events": [
    {
      "event_id": "event_001",
      "speaker_id": "speaker_1",
      "segment_id": "seg_001",
      "sentence": "Hello world!",
      "pre_reading": {
        "text": "Hello world!",
        "start": 0.0,
        "end": 1.0,
        "style": "normal",
        "alpha": "10"
      },
      "active_speech_words": [
        {
          "word": "Hello",
          "word_index": 0,
          "start": 0.5,
          "end": 1.0,
          "pronunciation_start": 0.5,
          "color_transition": {
            "from_color": "&H00FFFFFF",
            "to_color": "&H00FFFF00",
            "duration_ms": 150
          },
          "pop_animation": {
            "start": 0.5,
            "scale_up_duration_ms": 100,
            "scale_down_duration_ms": 200,
            "max_scale_percent": 115
          },
          "font_adjustments": {
            "size_percent": 5,
            "weight": 400,
            "width": 100
          }
        }
      ]
    }
  ],
  "elevation_effects": [],
  "global_timing_adjustments": {
    "pre_reading_lead_ms": 500,
    "color_transition_overlap_ms": 50,
    "animation_buffer_ms": 100
  }
}
```

## Styling

The library comes with default styles that follow the Caption With Intention design system. You can customize the appearance using CSS:

```css
/* Override default caption styles */
.caption-with-intention .caption-area {
  background-color: rgba(0, 0, 0, 0.95);
  border-radius: 12px;
}

.caption-with-intention .caption-word {
  font-family: 'Your Custom Font', 'Roboto Flex', sans-serif;
}
```

## Font Requirements

The Caption With Intention system uses the Roboto Flex variable font. The library includes this font, but you can also load it separately:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wdth,wght@8..144,25..151,100..1000&display=swap" rel="stylesheet">
```

## Browser Support

- Chrome 94+ (recommended for best performance)
- Firefox 90+
- Safari 15+
- Edge 94+

The library uses modern web APIs including:
- `requestVideoFrameCallback` for frame-perfect synchronization
- ResizeObserver for responsive layouts
- GSAP for high-performance animations

## Development

### Building the Library

```bash
# Development mode
npm run dev

# Build library
npm run build:lib

# Run tests
npm test

# Lint code
npm run lint
```

### Project Structure

```
ecg-player/
├── src/
│   ├── lib/                    # Library source code
│   │   ├── components/          # React components
│   │   ├── types/              # TypeScript definitions
│   │   ├── utils/              # Utility functions
│   │   ├── managers/           # Animation managers
│   │   └── index.ts            # Main export file
│   └── App.tsx                 # Demo application
├── dist/                       # Build output
│   ├── ecg-player.es.js    # ES module
│   ├── ecg-player.cjs.js   # CommonJS module
│   ├── ecg-player.umd.js   # UMD module
│   └── types/                  # TypeScript declarations
└── package.json
```

## API Reference

### Components

#### `<CaptionWithIntention />`

The main component for rendering Caption With Intention captions.

```tsx
import { CaptionWithIntention } from 'ecg-player';
```

### Types

All TypeScript types are exported for use in your application:

```tsx
import type {
  TimingSyncData,
  SyncEvent,
  Word,
  ElevationEffect,
  CaptionWithIntentionProps
} from 'ecg-player';
```

### Utilities

```tsx
import { assColorToCss, GSAPAnimationManager } from 'ecg-player';

// Convert ASS color format to CSS
const cssColor = assColorToCss('&H00FFFF00'); // Returns '#00FFFF'
```

## Performance Optimization

### Tips for Best Performance

1. **Use Production Build**: Always use the production build for deployment
2. **Optimize Video Files**: Use appropriate video codecs and resolutions
3. **Preload Timing Data**: Load timing sync data before video playback
4. **Hardware Acceleration**: Ensure GPU acceleration is enabled in the browser

### Memory Management

The library automatically manages animation lifecycles and cleans up resources when components unmount. For long-running applications, consider:

```tsx
// Manually clear animations if needed
import { GSAPAnimationManager } from 'ecg-player';

const manager = new GSAPAnimationManager();
// ... use manager
manager.clearAll(); // Clean up when done
```

## Troubleshooting

### Common Issues

1. **Captions not appearing**: Check that timing sync data is loaded correctly
2. **Performance issues**: Ensure hardware acceleration is enabled
3. **Font rendering issues**: Verify Roboto Flex font is loaded
4. **Sync issues**: Check video and timing data timestamps match

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Acknowledgments

- Caption With Intention design system by [Organization Name]
- GSAP animation library by GreenSock
- Roboto Flex font by Google Fonts

## Support

For issues and questions:
- GitHub Issues: [https://github.com/yourusername/ecg-player/issues](https://github.com/yourusername/ecg-player/issues)
- Documentation: [https://ecg-player.dev/docs](https://ecg-player.dev/docs)