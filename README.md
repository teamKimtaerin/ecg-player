# ECG Player

Caption With Intention 시스템을 구현한 React 컴포넌트 라이브러리입니다. 화자 정체성, 음성 특성, 발화 역학에 대한 시각적 정보를 제공하는 혁신적인 자막 시스템입니다.

## 특징

- 🎨 **화자 식별 색상 코딩** - 6색 시스템으로 화자별 색상 구분
- 🎵 **음성 특성 타이포그래피** - 음량, 음높이, 배음을 폰트 크기/굵기/폭으로 표현
- 🎬 **정확한 동기화** - 단어 단위 색상 전환 및 발음 시점 동기화
- 📱 **반응형 디자인** - 다양한 화면 크기 및 비율 대응
- ⚡ **고성능 애니메이션** - GSAP 기반 프레임 완벽 동기화

## 설치

### GitHub에서 직접 설치

```bash
# Yarn 사용
yarn add github:teamKimtaerin/ecg-player

# npm 사용
npm install github:teamKimtaerin/ecg-player
```

### 특정 브랜치/태그 설치

```bash
yarn add github:teamKimtaerin/ecg-player#main
npm install github:teamKimtaerin/ecg-player#main
```

## 사용법

### 기본 사용

```tsx
import React from 'react';
import { CaptionWithIntention } from 'ecg-player';

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

### 고정 크기로 사용

```tsx
import React from 'react';
import { CaptionWithIntention } from 'ecg-player';

function VideoPlayer() {
  return (
    <CaptionWithIntention
      videoSrc="/path/to/video.mp4"
      timingSyncSrc="/path/to/timing_sync.json"
      width={1920}
      height={1080}
      responsive={false}
    />
  );
}
```

### 동적 데이터 로딩

```tsx
import React, { useState, useEffect } from 'react';
import { CaptionWithIntention, TimingSyncData } from 'ecg-player';

function DynamicPlayer() {
  const [timingData, setTimingData] = useState<TimingSyncData | null>(null);

  useEffect(() => {
    fetch('/api/timing-sync')
      .then(response => response.json())
      .then(data => setTimingData(data));
  }, []);

  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <CaptionWithIntention
        videoSrc="/video.mp4"
        timingSyncData={timingData}
        responsive={true}
      />
    </div>
  );
}
```

## API 문서

### CaptionWithIntention Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoSrc` | `string` | - | 비디오 파일 URL 또는 경로 |
| `timingSyncSrc` | `string` | - | 타이밍 동기화 JSON 파일 URL |
| `timingSyncData` | `TimingSyncData` | - | 타이밍 동기화 데이터 (직접 전달시) |
| `width` | `number` | 800 | 플레이어 고정 너비 (responsive=false일 때) |
| `height` | `number` | 450 | 플레이어 고정 높이 (responsive=false일 때) |
| `responsive` | `boolean` | true | 반응형 크기 조정 활성화 |

### 타이밍 동기화 데이터 형식

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
```

### 타입스크립트 타입

모든 타입스크립트 타입을 import할 수 있습니다:

```tsx
import type {
  TimingSyncData,
  SyncEvent,
  Word,
  ElevationEffect,
  CaptionWithIntentionProps
} from 'ecg-player';
```

## 개발

### 개발 환경 설정

```bash
# 레포지토리 클론
git clone https://github.com/teamKimtaerin/ecg-player.git
cd ecg-player

# 의존성 설치
npm install

# 개발 서버 실행 (데모 페이지 확인)
npm run dev
```

### 빌드 명령어

```bash
# 개발 서버 실행 (데모 페이지)
npm run dev

# 데모 앱 빌드
npm run build

# 빌드 미리보기
npm run preview

# 린트 검사
npm run lint
```

### 프로젝트 구조

#### 라이브러리 코어 (GitHub 패키지에 포함)
```
src/
├── components/               # React 컴포넌트 ✅
│   └── CaptionWithIntention.tsx
├── managers/                 # 애니메이션 매니저 ✅
│   └── GSAPAnimationManager.ts
├── types/                    # TypeScript 타입 정의 ✅
│   └── index.ts
├── utils/                    # 유틸리티 함수 ✅
│   └── index.ts
└── index.ts                  # 라이브러리 진입점 ✅
```

#### 개발 환경 전용 (패키지에 포함되지 않음)
```
src/
├── App.tsx                   # 데모 애플리케이션 🚫
├── App.css                   # 데모 스타일 🚫
├── main.tsx                  # Vite 개발 서버 진입점 🚫
└── index.css                 # 글로벌 스타일 🚫

public/
└── test-output/              # 테스트 데이터 🚫

# 설정 파일
├── package.json              # GitHub 패키지 최적화
├── tsconfig.json             # TypeScript 설정
├── vite.config.ts            # 개발 서버 설정
└── README.md                 # 문서
```

**범례**  
✅ = GitHub 패키지에 포함  
🚫 = 개발 전용 (패키지에서 제외)

> **💡 개발 vs 패키지 사용**  
> - **개발 시**: `npm run dev`로 데모 페이지에서 컴포넌트 테스트
> - **패키지 사용 시**: 필요한 소스코드만 자동으로 가져와서 사용하는 프로젝트에서 빌드

## 기술적 요구사항

### 의존성

- React 16.8+ (Hooks 지원)
- TypeScript 4.5+
- GSAP 3.13+ (고성능 애니메이션)
- Roboto Flex 가변 폰트

### 브라우저 지원

- Chrome 94+ (권장)
- Firefox 90+
- Safari 15+
- Edge 94+

### 필요 웹 API

- `requestVideoFrameCallback` (프레임 완벽 동기화)
- `ResizeObserver` (반응형 레이아웃)
- Variable Fonts (동적 타이포그래피)

## Caption With Intention 시스템

### 색상 시스템

6가지 기본 색상으로 화자를 구분합니다:
- 주 화자: 대비되는 색상 (노랑, 파랑, 빨강, 주황, 녹색, 보라)
- 지원 화자: 중간 색조
- 보조 화자: 파스텔 톤

### 타이포그래피 매핑

- **음량 → 폰트 크기**: 3% (속삭임) ~ 12% (큰소리) 화면 높이 비율
- **음높이 → 폰트 굵기**: 낮은 음정 (600-710) ~ 높은 음정 (160-300)
- **배음 → 폰트 폭**: 낮은 배음 (150% 확장) ~ 높은 배음 (75% 압축)

### 애니메이션 효과

- **바운싱**: 글자별 웨이브 애니메이션
- **팝 효과**: 발음 시점에 15% 확대
- **엘리베이션**: 강조를 위한 25% 수직 상승
- **색상 전환**: 흰색에서 화자 색상으로 200ms 부드러운 전환

## 라이선스

MIT License

## 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 브랜치 생성: `git checkout -b feature/새기능`
3. 변경사항 커밋: `git commit -m 'Add 새기능'`
4. 브랜치 푸시: `git push origin feature/새기능`
5. Pull Request 생성

## 문제 해결

### 자막이 표시되지 않는 경우
- 타이밍 동기화 데이터가 올바르게 로드되었는지 확인
- 비디오와 JSON 파일 경로가 올바른지 확인

### 성능 문제
- 브라우저 하드웨어 가속 활성화 확인
- 프로덕션 빌드 사용 권장

### 폰트 렌더링 문제
- Roboto Flex 폰트가 제대로 로드되었는지 확인
- 네트워크에서 폰트 파일에 접근 가능한지 확인

## 지원

- GitHub Issues: [이슈 리포트](https://github.com/teamKimtaerin/ecg-player/issues)
- 문서: 이 README.md 파일 참조