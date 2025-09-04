import React, { useState } from 'react';
import CaptionWithIntention from './CaptionWithIntention';
import type { TimingSyncData } from '../types';

export const CaptionWithIntentionDemo: React.FC = () => {
  const [videoSrc, setVideoSrc] = useState<string | undefined>();
  const [timingSyncData, setTimingSyncData] = useState<TimingSyncData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      setTimingSyncData(data);
      console.log('Caption With Intention timing data loaded:', data);
      
    } catch (error: any) {
      console.error('Failed to load timing sync data:', error);
      setError(`Failed to load timing sync data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 업로드 핸들러들
  const handleVideoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      console.log('Video file loaded:', file.name);
    }
  };

  const handleTimingSyncFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: TimingSyncData = JSON.parse(text);
      setTimingSyncData(data);
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

  return (
    <div className="caption-with-intention-demo">
      {/* 비디오 플레이어 컴포넌트 */}
      {videoSrc && timingSyncData && (
        <CaptionWithIntention
          videoSrc={videoSrc}
          timingSyncData={timingSyncData}
          responsive={true}
        />
      )}

      {/* 비디오나 자막이 없을 때 플레이스홀더 */}
      {(!videoSrc || !timingSyncData) && (
        <div style={{
          width: '100%',
          height: '450px',
          backgroundColor: '#f8f9fa',
          border: '2px dashed #dee2e6',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6c757d',
          fontSize: '18px',
          textAlign: 'center'
        }}>
          {!videoSrc && !timingSyncData ? (
            <div>
              <p>📹 비디오 파일과 타이밍 동기화 파일을 업로드하거나</p>
              <p>테스트 데이터를 로드하여 시작하세요</p>
            </div>
          ) : !videoSrc ? (
            <p>📹 비디오 파일을 업로드하세요</p>
          ) : (
            <p>📄 타이밍 동기화 파일을 업로드하세요</p>
          )}
        </div>
      )}
      
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
          timingSyncData ? `Caption With Intention Ready (${timingSyncData.sync_events.length} events)` :
          'No timing data loaded'
        }
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

export default CaptionWithIntentionDemo;